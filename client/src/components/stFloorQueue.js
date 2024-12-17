import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './StFloor.css';

// Use the base URL from the .env file
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const socket = io.connect(`${API_BASE_URL}`);

const StFloorQueue = () => {
  // Filtered section names to include only the three required sections
  const sectionNames = useMemo(
    () => [
      'Application Issue',
      'Deposit Unit',
      'Member Information Contract',
    ],
    []
  );

  const [queues, setQueues] = useState(
    sectionNames.map((section) => ({ section, customers: [] }))
  );

  // Memoized fetchQueues to avoid re-creation
  const fetchQueues = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/queues`);
      const groupedQueues = res.data.reduce((acc, queue) => {
        if (!acc[queue.section]) acc[queue.section] = [];
        acc[queue.section].push(queue);
        return acc;
      }, {});

      // Only update queues for the filtered sections
      const updatedQueues = sectionNames.map((section) => ({
        section,
        customers: groupedQueues[section] ? groupedQueues[section].slice(0, 5) : [], // Limit to 5 customers
      }));

      setQueues(updatedQueues);
    } catch (err) {
      console.error('Error fetching queues:', err);
    }
  }, [sectionNames]);

  useEffect(() => {
    fetchQueues();

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
        const res = await axios.get(`${API_BASE_URL}/queues`);
        const groupedQueues = res.data.reduce((acc, queue) => {
          if (!acc[queue.section]) acc[queue.section] = [];
          acc[queue.section].push(queue);
          return acc;
        }, {});

        const updatedQueues = sectionNames.map((section) => ({
          section,
          customers: groupedQueues[section] ? groupedQueues[section].slice(0, 10) : [], // Limit to 10 customers
        }));

        setQueues(updatedQueues);
      }, 500); // Match animation duration
    });

    return () => {
      socket.off('queue-updated');
    };
  }, [fetchQueues, sectionNames]);

  return (
    <div className="container">
      <div className="header">Queue Dashboard</div>

      <div className="sectionsWrapper1">
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
        {/* Removed Cheque status section */}
      </div>
    </div>
  );
};

export default StFloorQueue;
