import React, {useState} from 'react';
import axios from 'axios';
import './FileUpload.css'; // Importer le fichier CSS pour le style

const FileUpload: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [nbParGroupe, setNbParGroupe] = useState<number>(10); // Valeur par défaut
    const [results, setResults] = useState<{ name: string; count: number }[]>([]); // État pour stocker les résultats

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };

    const handleNbParGroupeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setNbParGroupe(Number(event.target.value));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!file) {
            alert("Veuillez sélectionner un fichier.");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            let response;

            // Vérifier si nbParGroupe est égal à 0
            if (nbParGroupe === 0) {
                // Appeler l'endpoint /first
                response = await axios.post('http://localhost:3000/first', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            } else {
                formData.append('nbParGroupe', nbParGroupe.toString());
                response = await axios.post('http://localhost:3000/second', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            }

            console.log(response.data); // Afficher le résultat dans la console

            // Traiter la réponse pour créer un tableau d'objets
            const data = response.data.data.split('<br>').map((item: { split: (arg0: string) => [any, any]; }) => {
                const [name, count] = item.split('\t');
                return {
                    name: name.replace(/&c/g, '').replace(/[^\w\s]/g, '').trim(), // Enlever les caractères spéciaux
                    count: parseInt(count, 10)
                };
            }).filter((item: { name: any; count: number; }) => item.name && !isNaN(item.count)); // Filtrer les entrées vides

            // Trier les résultats par nombre d'occurrences (du plus grand au plus petit)
            data.sort((a: { count: number; }, b: { count: number; }) => b.count - a.count);

            setResults(data); // Mettre à jour l'état avec les résultats
        } catch (error) {
            console.error("Erreur lors de l'envoi du fichier :", error);
        }
    };

    return (
        <div className="file-upload-container">
            <h1>Télécharger un fichier</h1>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="file">Choisissez un fichier :</label>
                    <input type="file" id="file" onChange={handleFileChange}/>
                </div>
                <div className="form-group">
                    <label htmlFor="nbParGroupe">Nombre par groupe :</label>
                    <input
                        type="number"
                        id="nbParGroupe"
                        value={nbParGroupe}
                        onChange={handleNbParGroupeChange}
                    />
                </div>
                <button type="submit">Envoyer</button>
            </form>

            {/* Afficher les résultats dans un tableau */}
            {results.length > 0 && (
                <table>
                    <thead>
                    <tr>
                        <th>Nom</th>
                        <th>Nombre</th>
                    </tr>
                    </thead>
                    <tbody>
                    {results.map((result, index) => (
                        <tr key={index}>
                            <td>{result.name}</td>
                            <td>{result.count}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default FileUpload;
