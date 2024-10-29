import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Typography, Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, CircularProgress, Backdrop } from '@mui/material';

const FileUpload: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [nbParGroupe, setNbParGroupe] = useState<number>(10);
    const [results, setResults] = useState<{ name: string; count: number }[]>([]);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(100);
    const [loading, setLoading] = useState<boolean>(false); // État pour le chargement

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
        setLoading(true); // Démarrer le chargement

        try {
            let response;

            if (nbParGroupe === 0) {
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

            const data = response.data.data; // Utiliser directement l'objet retourné
            setResults(data); // Mettre à jour l'état avec les résultats
            setPage(0); // Réinitialiser la page à 0 lors de la soumission
        } catch (error) {
            console.error("Erreur lors de l'envoi du fichier :", error);
        } finally {
            setLoading(false); // Arrêter le chargement
        }
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); // Réinitialiser à la première page lors du changement de nombre de lignes par page
    };

    return (
        <Container maxWidth="sm" style={{ marginTop: '20px' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Télécharger un fichier
            </Typography>
            <form onSubmit={handleSubmit}>
                <TextField
                    type="file"
                    onChange={handleFileChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                />
                <TextField
                    type="number"
                    label="Nombre par groupe"
                    value={nbParGroupe}
                    onChange={handleNbParGroupeChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                />
                <Button type="submit" variant="contained" color="primary" fullWidth>
                    Envoyer
                </Button>
            </form>

            {results.length > 0 && (
                <TableContainer component={Paper} style={{ marginTop: '20px' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Nom</TableCell>
                                <TableCell>Nombre</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {results.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((result, index) => (
                                <TableRow key={index}>
                                    <TableCell>{result.name}</TableCell>
                                    <TableCell>{ result.count}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <TablePagination
                        rowsPerPageOptions={[100, 200, 500]}
                        component="div"
                        count={results.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </TableContainer>
            )}

            {loading && (
                <Backdrop open={loading} style={{ zIndex: 1, color: '#fff' }}>
                    <CircularProgress color="inherit" />
                </Backdrop>
            )}
        </Container>
    );
};

export default FileUpload;
