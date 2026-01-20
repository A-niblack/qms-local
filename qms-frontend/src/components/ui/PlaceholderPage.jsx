import React from 'react';

const PlaceholderPage = ({ title }) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
    <div className="bg-white p-8 rounded-lg shadow-md text-center">
      <p className="text-gray-600">This feature is under construction.</p>
    </div>
  </div>
);
export default PlaceholderPage;