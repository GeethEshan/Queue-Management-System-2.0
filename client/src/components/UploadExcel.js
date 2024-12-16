import React, { useState } from 'react';
import axios from 'axios';
import './UploadExcel.css';

function UploadExcel() {
  const [file, setFile] = useState(null);

  // Handle file input change
  const onFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Handle file upload
  const onUpload = () => {
    if (!file) {
      alert('Please select a file before uploading');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    // Send the file to the server using the base URL from .env
    const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/upload-excel`;

    axios.post(apiUrl, formData)
      .then(response => {
        alert(response.data.message || 'File uploaded successfully');
      })
      .catch(error => {
        console.error('Error uploading file:', error);
        alert('Error uploading file');
      });
  };

  return (
    <div className="upload-container">
      <h3>Upload Excel File</h3>
      <label htmlFor="file-upload" className="file-label">
        {file ? file.name : 'No file chosen'}
      </label>
      <input 
        id="file-upload"
        type="file" 
        accept=".xlsx,.xls" 
        onChange={onFileChange} 
        style={{ display: 'none' }} 
      />
      <button onClick={onUpload}>Upload</button>
    </div>
  );
}

export default UploadExcel;
