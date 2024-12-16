import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import './Section.css';

const socket = io.connect(process.env.REACT_APP_API_BASE_URL);

const Section = () => {
  const { section } = useParams();
  const [queue, setQueue] = useState([]);
  const [checkStatusQueue, setCheckStatusQueue] = useState([]);
  const [disabledButtons, setDisabledButtons] = useState({});
  const [alertMessage, setAlertMessage] = useState(null);

  // Fetching queue and Check Status data
  useEffect(() => {
    const fetchQueueAndCheckStatus = async () => {
      try {
        const queueRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/queue/${section}`);
        setQueue(queueRes.data);

        const checkStatusRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/check-status2`);
        setCheckStatusQueue(checkStatusRes.data);
      } catch (err) {
        setAlertMessage({ type: 'error', message: 'Error fetching data from the server.' });
        console.error('Error fetching data:', err);
      }
    };

    fetchQueueAndCheckStatus();
  }, [section]);

  const handleFinish = async (id) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/queue/${id}`);
      socket.emit('queue-updated', { section });
      setQueue(prevQueue => {
        const updatedQueue = prevQueue.filter(item => item._id !== id);
        return updatedQueue.map((item, index) => ({
          ...item,
          position: index + 1,
        }));
      });
      setAlertMessage({ type: 'success', message: 'Customer removed from the queue successfully.' });
    } catch (err) {
      setAlertMessage({ type: 'error', message: 'Error removing customer from the queue.' });
      console.error('Error removing customer from the queue:', err);
    }
  };

  const handleAddToCheckStatus = async (membershipNumber, id) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/add-to-check-status`, { membershipNumber });
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/queue/${id}`);

      setQueue(prevQueue => {
        const updatedQueue = prevQueue.filter(item => item._id !== id);
        return updatedQueue.map((item, index) => ({
          ...item,
          position: index + 1,
        }));
      });

      setAlertMessage({ type: 'success', message: `Membership number ${membershipNumber} added to Check Status.` });
    } catch (err) {
      setAlertMessage({ type: 'error', message: 'Error adding to Check Status.' });
      console.error('Error adding to Check Status:', err);
    }
  };

  const handleUpdateStatus = async (id) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_BASE_URL}/check-status/${id}/ready`);
      socket.emit('check-status-updated');
      setCheckStatusQueue(prevQueue => prevQueue.map(item =>
        item._id === id ? { ...item, status: 'ready' } : item
      ));
      setDisabledButtons(prev => ({ ...prev, [id]: true }));
      setAlertMessage({ type: 'success', message: 'Status updated to "Ready".' });
    } catch (err) {
      setAlertMessage({ type: 'error', message: 'Error updating status.' });
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteCheckStatus = async (id) => {
    if (!id) {
      setAlertMessage({ type: 'info', message: 'No items to delete.' });
      return;
    }

    try {
      const result = await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/check-status/${id}/collected`);
      if (result.status === 200) {
        socket.emit('check-status-updated');
        setCheckStatusQueue(prevQueue => prevQueue.filter(item => item._id !== id));
        setAlertMessage({ type: 'success', message: 'Item removed from Check Status.' });
      } else {
        setAlertMessage({ type: 'info', message: 'No item found to delete.' });
      }
    } catch (err) {
      setAlertMessage({ type: 'error', message: 'An error occurred while removing the item.' });
      console.error('Error deleting from Check Status:', err);
    }
  };

  useEffect(() => {
    // Auto hide the alert message after 2 seconds
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null); // Reset alert after 2 seconds
      }, 2000);

      // Cleanup the timer when the component is unmounted or alertMessage changes
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  useEffect(() => {
    socket.on('queue-updated', ({ section: updatedSection }) => {
      if (updatedSection === section) {
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/queue/${section}`).then(res => setQueue(res.data));
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/check-status2`).then(res => setCheckStatusQueue(res.data));
      }
    });

    socket.on('check-status-updated', () => {
      axios.get(`${process.env.REACT_APP_API_BASE_URL}/check-status2`).then(res => setCheckStatusQueue(res.data));
    });

    return () => {
      socket.off('queue-updated');
      socket.off('check-status-updated');
    };
  }, [section]);

  return (
    <div className="section-container">
      <h1 className="section-heading">{section} Section</h1>

      {/* Alert message display */}
      {alertMessage && (
        <div className={`alert ${alertMessage.type}`}>
          {alertMessage.message}
        </div>
      )}

      <div className={section === 'Loan' ? 'loan-section-container' : 'common-section-container'}>
        <div className={section === 'Loan' ? 'loan-left' : 'common-left'}>
          <h2 className="queue-heading">Queue</h2>
          <ul>
            {queue.length > 0 ? (
              queue.map((item, index) => (
                <li key={item._id} style={{ fontWeight: index === 0 ? 'bold' : 'normal' }}>
                  {item.membershipNumber} (Position: {item.position})

                  {index === 0 && (
                    <>
                      <button onClick={() => handleFinish(item._id)}>Finish Service</button>
                      {section === 'Loan' && (
                        <button onClick={() => handleAddToCheckStatus(item.membershipNumber, item._id)}>
                          Add to Check Status
                        </button>
                      )}
                    </>
                  )}
                </li>
              ))
            ) : (
              <li>No customers in the queue for {section}.</li>
            )}
          </ul>
        </div>

        {section === 'Loan' && (
          <div className="loan-right">
            <h2 className="queue-heading">Cheque Status</h2>
            <ul>
              {checkStatusQueue.length > 0 ? (
                checkStatusQueue.map(item => (
                  <li key={item._id}>
                    {item.membershipNumber} - Status: {item.status}
                    {item.status !== 'ready' && (
                      <button
                        onClick={() => handleUpdateStatus(item._id)}
                        style={{
                          display: item.status === 'ready' ? 'none' : 'inline-block',
                          cursor: disabledButtons[item._id] ? 'not-allowed' : 'pointer',
                          opacity: disabledButtons[item._id] ? 0.5 : 1
                        }}
                        disabled={disabledButtons[item._id] || item.status === 'ready'}
                      >
                        Ready
                      </button>
                    )}
                    <button onClick={() => handleDeleteCheckStatus(item._id)}>Collected</button>
                  </li>
                ))
              ) : (
                <li>No customers in Check Status.</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Section;
