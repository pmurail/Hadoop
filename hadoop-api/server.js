const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const app = express();
const port = 3000;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "/input");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.post("/first", upload.single("file"), (req, res) => {
    handleFileUpload(req.file.filename, res);
});

app.post("/second", upload.single("file"), (req, res) => {
    const nbParGroupe = parseInt(req.body.nbParGroupe, 10);
    const filePath = path.join(__dirname, "/input", req.file.filename);

    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            return res.status(500).send({ message: "Error reading file" });
        }

        const lines = data.split("\n");
        lines.shift(); 
        const sequence = lines.join("").replace(/\s+/g, "");

        let groupedString = "";
        for (let i = 0; i < sequence.length; i += nbParGroupe) {
            groupedString += sequence.substring(i, i + nbParGroupe) + " ";
        }

        const outputFilePath = path.join(__dirname, "/input", "ecoli.fa");

        fs.writeFile(outputFilePath, groupedString.trim(), (err) => {
            if (err) {
                return res.status(500).send({ message: "Error writing to file" });
            }

            handleFileUpload(req.file.filename, res);
        });
    });
});

function handleFileUpload(filename, res) {
    const sourceFile = path.join(__dirname, "/input/", filename);
    const destinationDir = "/input";

    copyToHDFS(sourceFile, destinationDir, (copyError) => {
        if (copyError) {
            return res.status(500).send(copyError);
        }

        runWordCount(filename, (wordCountError) => {
            if (wordCountError) {
                return res.status(500).send(wordCountError);
            }

            readOutput((readError, outputData) => {
                if (readError) {
                    return res.status(500).send(readError);
                }

                res.send({ data: buildData(outputData) });

                cleanUpOutput((cleanupError) => {
                    if (cleanupError) {
                        console.error(cleanupError);
                    }
                });
            });
        });
    });
}

function copyToHDFS(sourceFile, destinationDir, callback) {
    const hdfsCopy = spawn('hdfs', ['dfs', '-copyFromLocal', '-f', sourceFile, destinationDir]);

    hdfsCopy.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    hdfsCopy.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    hdfsCopy.on('close', (code) => {
        if (code !== 0) {
            return callback({ message: `Error copying file to HDFS, exit code: ${code}` });
        }
        callback(null);
    });
}

function readOutput(callback) {
    const hdfsCat = spawn('hdfs', ['dfs', '-cat', '/output/part-r-00000']);

    let outputData = '';

    hdfsCat.stdout.on('data', (data) => {
        outputData += data;
    });

    hdfsCat.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    hdfsCat.on('close', (code) => {
        if (code !== 0) {
            return callback({ message: "Error reading output" });
        }
        callback(null, outputData);
    });
}

function runWordCount(filename, callback) {
    const inputPath = `/input`;
    const outputPath = `/output`;

    console.log(`Running wordcount on ${inputPath} and outputting to ${outputPath}`);

    const hadoopCommand = spawn('hadoop', ['jar', '/usr/local/hadoop-3.4.0/share/hadoop/mapreduce/hadoop-mapreduce-examples-3.4.0.jar', 'wordcount', inputPath, outputPath]);

    hadoopCommand.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    hadoopCommand.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    hadoopCommand.on('close', (code) => {
        if (code !== 0) {
            return callback({ message: "Error running wordcount" });
        }
        callback(null);
    });
}

function cleanUpOutput(callback) {
    const hdfsRemove = spawn('hdfs', ['dfs', '-rm', '-r', '/output']);

    hdfsRemove.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    hdfsRemove.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    hdfsRemove.on('close', (code) => {
        if (code !== 0) {
            return callback({ message: "Error removing output" });
        }
        callback(null);
    });
}

function buildData(data) {
    const lines = data.replaceAll("\n", "<br>").split('<br>');

    const response = lines.map((item) => {
        const [name, count] = item.split('\t');
        return {
            name: name ? name.replace(/&c/g, '').replace(/[^\w\s]/g, '').trim() : null,
            count: count ? parseInt(count, 10) : null
        };
    }).filter((item) => item.name && !isNaN(item.count)); 
    return response.sort((a, b) => b.count - a.count);
}

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});