import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Admin.css';
import UploadExcel from './UploadExcel'; // Import the UploadExcel component

const Admin = () => {
    const [sections, setSections] = useState([]);
    const [sectionName, setSectionName] = useState('');
    const [editingSectionId, setEditingSectionId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const sectionsPerPage = 4;

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

    // Fetch sections
    useEffect(() => {
        axios.get(`${API_BASE_URL}/sections`)
            .then(res => setSections(res.data))
            .catch(err => setError('Error fetching sections: ' + err.message));
    }, [API_BASE_URL]);

    const addSection = () => {
        axios.post(`${API_BASE_URL}/sections`, { name: sectionName })
            .then(res => {
                setSections([...sections, res.data]);
                setSectionName('');
            })
            .catch(err => setError('Error adding section: ' + err.message));
    };

    const deleteSection = (id) => {
        axios.delete(`${API_BASE_URL}/sections/${id}`)
            .then(() => {
                setSections(sections.filter(s => s._id !== id));
            })
            .catch(err => setError('Error deleting section: ' + err.message));
    };

    const startEditing = (id, name) => {
        setEditingSectionId(id);
        setEditingName(name);
    };

    const cancelEditing = () => {
        setEditingSectionId(null);
        setEditingName('');
    };

    const saveEdit = (id) => {
        axios.put(`${API_BASE_URL}/sections/${id}`, { name: editingName })
            .then(() => {
                const updatedSections = sections.map(section =>
                    section._id === id ? { ...section, name: editingName } : section
                );
                setSections(updatedSections);
                setEditingSectionId(null);
                setEditingName('');
            })
            .catch(err => setError('Error updating section: ' + err.message));
    };

    // Pagination
    const totalPages = Math.ceil(sections.length / sectionsPerPage);
    const indexOfLastSection = currentPage * sectionsPerPage;
    const indexOfFirstSection = indexOfLastSection - sectionsPerPage;
    const currentSections = sections.slice(indexOfFirstSection, indexOfLastSection);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    return (
        <div className="admin-container">
            <h1>Admin Panel</h1>
            {error && <div style={{ color: 'red' }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, paddingRight: '20px' }} className="left-side">
                    <div className="add-section-container">
                        <input
                            className="section-input"
                            value={sectionName}
                            onChange={(e) => setSectionName(e.target.value)}
                            placeholder="Add Section"
                        />
                        <button className="add-btn" onClick={addSection}>Add</button>
                    </div>

                    <h2 className="sections-heading">Sections</h2>
                    <ul className="sections-list">
                        {currentSections.map(section => (
                            <li key={section._id}>
                                {editingSectionId === section._id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                        />
                                        <button className="edit-btn" onClick={() => saveEdit(section._id)}>Save</button>
                                        <button className="delete-btn" onClick={cancelEditing}>Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <span>{section.name}</span>
                                        <div>
                                            <button
                                                className="edit-btn"
                                                onClick={() => startEditing(section._id, section.name)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="delete-btn"
                                                onClick={() => deleteSection(section._id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>

                    <div className="pagination">
                        {currentPage > 1 && (
                            <button
                                className="pagination-btn"
                                onClick={handlePreviousPage}
                            >
                                Previous
                            </button>
                        )}
                        <span 
    className="current-page" 
    style={{ color: 'white' }}
>
    Page {currentPage} of {totalPages}
</span>

                        {currentPage < totalPages && (
                            <button
                                className="pagination-btn"
                                onClick={handleNextPage}
                            >
                                Next
                            </button>
                        )}
                    </div>
                </div>

                <div 
    style={{
        flex: 1, 
        paddingLeft: '60px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center'
    }} 
    className="right-side"
>
    <UploadExcel /> {/* Include the UploadExcel component */}
</div>

            </div>
        </div>
    );
};

export default Admin;
