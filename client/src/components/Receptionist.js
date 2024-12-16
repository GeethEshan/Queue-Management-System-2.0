import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './Receptionist.css';

// Connect to the socket server
const socket = io.connect(process.env.REACT_APP_API_BASE_URL);

const Receptionist = () => {
  const [membershipNumber, setMembershipNumber] = useState('');
  const [section, setSection] = useState('');
  const [sections, setSections] = useState([]);
  const [queues, setQueues] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customerData, setCustomerData] = useState(null);
  const [pagination, setPagination] = useState({});
  const [showModal, setShowModal] = useState(false); // State to control modal visibility

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  // Wrap fetchQueues in useCallback to avoid re-creating the function on each render
  const fetchQueues = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/queues`);
      const groupedQueues = res.data.reduce((acc, queue) => {
        if (!acc[queue.section]) acc[queue.section] = [];
        acc[queue.section].push(queue);
        return acc;
      }, {});

      const formattedQueues = Object.entries(groupedQueues).map(([section, customers]) => ({
        section,
        customers,
      }));

      setQueues(formattedQueues);

      const initialPagination = formattedQueues.reduce((acc, group) => {
        acc[group.section] = 1;
        return acc;
      }, {});
      setPagination(initialPagination);
    } catch (err) {
      console.error('Error fetching queues:', err);
      setError('Failed to load queues. Please try again.');
    }
  }, [apiBaseUrl]); // Make sure apiBaseUrl is in the dependency array

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await axios.get(`${apiBaseUrl}/sections`);
        setSections(res.data);
      } catch (err) {
        console.error('Error fetching sections:', err);
        setError('Failed to load sections. Please try again.');
      }
    };
    fetchSections();
    fetchQueues(); // Call fetchQueues when the component mounts
  }, [apiBaseUrl, fetchQueues]); // Add apiBaseUrl and fetchQueues to the dependency array

  useEffect(() => {
    socket.on('queue-updated', () => {
      fetchQueues();
    });
    return () => socket.off('queue-updated');
  }, [fetchQueues]); // Add fetchQueues to the dependency array

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!membershipNumber) {
      setError('Please enter a membership number.');
      return;
    }

    try {
      const res = await axios.get(`${apiBaseUrl}/customers/${membershipNumber}`);
      if (res.data) {
        setCustomerData(res.data);
        setError('');
        setShowModal(true); // Show the modal when the customer is found
      } else {
        setCustomerData(null);
        setError('No such customer.');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
      setError('No such customer.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleQueueSubmit = async () => {
    if (!customerData || !section) {
      setError('Please ensure customer data is loaded and a section is selected.');
      return;
    }

    try {
      await axios.post(`${apiBaseUrl}/queue`, { membershipNumber, section });
      setSuccess('Customer added to queue successfully!');
      fetchQueues();
      setShowModal(false); // Close the modal after adding to the queue

      // Reset membership number and section input fields
      setMembershipNumber('');
      setSection('');

      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error adding to queue:', err);
      setError('Failed to add customer to queue.');
    }
  };

  const handlePagination = (section, direction) => {
    setPagination((prevPagination) => {
      const currentPage = prevPagination[section] || 1;
      const nextPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
      return {
        ...prevPagination,
        [section]: nextPage,
      };
    });
  };

  const getPageQueues = (section) => {
    const currentPage = pagination[section] || 1;
    const startIndex = (currentPage - 1) * 7;
    const endIndex = startIndex + 7;
    return queues.find(queue => queue.section === section)?.customers.slice(startIndex, endIndex);
  };

  return (
    <div className="admin-container">
      <h1>Receptionist Panel</h1>
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          placeholder="Enter Membership Number"
          value={membershipNumber}
          onChange={(e) => setMembershipNumber(e.target.value)}
          className="membership-input"
        />
        <button type="submit" className="enter-button">Enter</button>
      </form>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {/* Modal for displaying customer details and actions */}
      {showModal && customerData && (
        <div className="modal">
          <div className="modal-content" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '5px', width: '400px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '20px', color: 'black' }}>Customer Details</h3>
            <p style={{ textAlign: 'left', fontWeight: 'bold' }}>Name: <span style={{ fontWeight: 'normal' }}>{customerData.name}</span></p>
            <p style={{ textAlign: 'left', fontWeight: 'bold' }}>Hospital: <span style={{ fontWeight: 'normal' }}>{customerData.hospital}</span></p>
            <p style={{ textAlign: 'left', fontWeight: 'bold' }}>Designation: <span style={{ fontWeight: 'normal' }}>{customerData.designation}</span></p>

            <div style={{ textAlign: 'left', marginTop: '10px' }}>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                style={{ padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc', width: '100%' }}
              >
                <option value="">Select Section</option>
                {sections.map((sec) => (
                  <option key={sec._id} value={sec.name}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button
                onClick={handleQueueSubmit}
                style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}
              >
                Add to Queue
              </button>
            </div>

            <div style={{ marginTop: '10px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: '10px 20px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <h2>All Queues</h2>
      <div className="queues-container">
        {queues.length > 0 ? (
          queues.map((queueGroup) => {
            const customersForPage = getPageQueues(queueGroup.section);
            const currentPage = pagination[queueGroup.section] || 1;
            const totalCustomers = queueGroup.customers.length;
            const hasMoreCustomers = currentPage * 7 < totalCustomers;

            const showNextButton = hasMoreCustomers;
            const showPrevButton = currentPage > 1;

            return (
              <div key={queueGroup.section} className="queue-group">
                <h3 style={{ color: 'black', textAlign: 'center' }}>
                  {queueGroup.section}
                </h3>
                <ul>
                  {customersForPage.length > 0 ? (
                    customersForPage.map((item) => (
                      <li key={item._id}>
                        {item.membershipNumber} (Position: {item.position})
                      </li>
                    ))
                  ) : (
                    <li>No customers in queue</li>
                  )}
                </ul>
                <div className="pagination-controls">
                  {showPrevButton && (
                    <button onClick={() => handlePagination(queueGroup.section, 'prev')}>Previous</button>
                  )}
                  <span
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      color: 'black',
                      margin: '0 auto'
                    }}
                  >
                    Page {currentPage}
                  </span>

                  {showNextButton && (
                    <button onClick={() => handlePagination(queueGroup.section, 'next')}>Next</button>
                  )}
                </div>
                <hr />
              </div>
            );
          })
        ) : (
          <p>No queues available.</p>
        )}
      </div>
    </div>
  );
};

export default Receptionist;
