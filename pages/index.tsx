import type { NextPage } from 'next';
import React from 'react';

const Home: NextPage = () => {
  return (
    <div style={{ 
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1>WanMarKay Backend API</h1>
      <p>Esta es la API backend para el sistema WanMarKay.</p>
      <p>Los endpoints disponibles son:</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li><code>/api/upload-voucher</code> - POST - Subir comprobantes de pago</li>
      </ul>
    </div>
  );
};

export default Home; 