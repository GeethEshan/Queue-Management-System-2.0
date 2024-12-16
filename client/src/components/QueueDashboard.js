import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './QueueDashboard.css';

const socket = io.connect(process.env.REACT_APP_API_BASE_URL);

const QueueDashboard = () => {
  const sectionNames = useMemo(
    () => [
      'Application Issue',
      'Death Donation',
      'Deposit Unit',
      'Final Payment',
      'Loan',
      'Member Information Contract',
    ],
    []
  );

  const [queues, setQueues] = useState(
    sectionNames.map((section) => ({ section, customers: [] }))
  );
  const [statusItems, setStatusItems] = useState([]);

  const fetchQueues = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/queues`);
      const groupedQueues = res.data.reduce((acc, queue) => {
        if (!acc[queue.section]) acc[queue.section] = [];
        acc[queue.section].push(queue);
        return acc;
      }, {});

      const updatedQueues = sectionNames.map((section) => ({
        section,
        customers: groupedQueues[section] ? groupedQueues[section].slice(0, 5) : [], // Limit to 5 customers
      }));

      setQueues(updatedQueues);
    } catch (err) {
      console.error('Error fetching queues:', err);
    }
  }, [sectionNames]);

  const fetchCheckStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/check-status2`);
      setStatusItems(res.data);
    } catch (err) {
      console.error('Error fetching check status:', err);
    }
  }, []);

  useEffect(() => {
    fetchQueues();
    fetchCheckStatus();

    socket.on('queue-updated', async (updatedSection) => {
      console.log('Queue updated for section:', updatedSection);

      setQueues((prevQueues) =>
        prevQueues.map((sectionQueue) => {
          if (sectionQueue.section === updatedSection) {
            console.log('Applying fadeOut to:', sectionQueue.customers[0]);
            const updatedCustomers = sectionQueue.customers.map((customer, index) =>
              index === 0 ? { ...customer, fadeOut: true } : customer
            );
            return { ...sectionQueue, customers: updatedCustomers };
          }
          return sectionQueue;
        })
      );

      setTimeout(async () => {
        const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/queues`);
        const groupedQueues = res.data.reduce((acc, queue) => {
          if (!acc[queue.section]) acc[queue.section] = [];
          acc[queue.section].push(queue);
          return acc;
        }, {});

        const updatedQueues = sectionNames.map((section) => ({
          section,
          customers: groupedQueues[section] ? groupedQueues[section].slice(0, 5) : [], // Limit to 5 customers
        }));

        setQueues(updatedQueues);
      }, 500); // Match animation duration
    });

    socket.on('check-status-updated', async () => {
      console.log('Check status updated');
      fetchCheckStatus(); // Fetch updated check status
    });

    return () => {
      socket.off('queue-updated');
      socket.off('check-status-updated');
    };
  }, [fetchQueues, fetchCheckStatus, sectionNames]);

  return (
    <div className="container">
      <div className="header">Queue Dashboard</div>

      <div className="sectionsWrapper">
        {queues.map((sectionQueue, index) => (
          <div key={index} className="section">
            <div className="sectionTitle">{sectionQueue.section}</div>
            <ul>
              {sectionQueue.customers.map((customer, customerIndex) => (
                <li
                  key={customer._id}
                  className={`customerItem ${customerIndex === 0 ? 'serving' : ''} ${customer.fadeOut ? 'fadeOut' : ''}`}
                >
                  {customerIndex === 0 ? '(Serving)' : `${customerIndex + 1}.`} {customer.membershipNumber}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="sectionsRight">
        {/* Cheque status */}
        <div className="statusContainer">
          <h3>Cheque status:</h3>
          <ul className="statusList">
            {statusItems.length > 0 ? (
              statusItems.slice(0, 16).map((item) => (  // Limit to 16 items
                <li key={item.membershipNumber} className="statusItem">
                  <span className={`statusCircle ${item.status === 'pending' ? 'pending' : 'ready'}`}></span>
                  {item.membershipNumber}
                </li>
              ))
            ) : (
              <li>No status available</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QueueDashboard;
