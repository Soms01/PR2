import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';

const C_KM_S = 300000; // Швидкість світла, км/с

export default function App() {
  const [targets, setTargets] = useState([]);
  const [config, setConfig] = useState({
    measurementsPerRotation: 180,
    rotationSpeed: 10,
    numberOfTargets: 5,
    targetSpeed: 3000
  });
  
  const wsRef = useRef(null);

  // Підключення до WebSocket та прийом даних
  useEffect(() => {
    wsRef.current = new WebSocket('ws://localhost:21700');

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.echoResponses && data.echoResponses.length > 0) {
        const newTargets = data.echoResponses.map((echo) => ({
          id: Math.random().toString(36).substr(2, 9),
          theta: data.scanAngle,
          r: (C_KM_S * echo.time) / 2, // Обчислення відстані R = (c * t) / 2
          power: echo.power,
          opacity: 1.0, // Початкова непрозорість
          timestamp: Date.now()
        }));

        setTargets((prev) => [...prev, ...newTargets]);
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Ефект післясвітіння: поступове зменшення прозорості (слід радара)
  useEffect(() => {
    const fadeInterval = setInterval(() => {
      setTargets((prevTargets) => 
        prevTargets
          .map(t => ({ ...t, opacity: t.opacity - 0.05 })) // Зниження прозорості
          .filter(t => t.opacity > 0) // Видалення старих точок
      );
    }, 500); // Оновлення кожні півсекунди

    return () => clearInterval(fadeInterval);
  }, []);

  // Обробник зміни параметрів конфігурації
  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: Number(value) }));
  };

  // Відправка PUT запиту на оновлення конфігурації
  const applyConfig = async () => {
    try {
      await fetch('http://localhost:21700/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      alert('Параметри успішно оновлено!');
    } catch (error) {
      console.error('Помилка оновлення конфігурації:', error);
      alert('Не вдалося оновити параметри.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', padding: '20px', gap: '20px', fontFamily: 'sans-serif' }}>
      
      {/* Графік радара */}
      <div style={{ flex: 1 }}>
        <h2>Радар</h2>
        <Plot
          data={[
            {
              type: 'scatterpolar',
              mode: 'markers',
              r: targets.map(t => t.r),
              theta: targets.map(t => t.theta),
              marker: {
                size: 8,
                // Відображення потужності (логарифм) через колір, з урахуванням прозорості
                color: targets.map(t => `rgba(0, 255, 100, ${t.opacity})`),
                line: { color: 'transparent' }
              },
              hoverinfo: 'r+theta',
            }
          ]}
          layout={{
            width: 700,
            height: 700,
            paper_bgcolor: '#111',
            plot_bgcolor: '#111',
            font: { color: '#0f0' },
            polar: {
              bgcolor: '#001a00',
              angularaxis: {
                direction: 'clockwise', // Напрямок як у компаса
                tickcolor: '#0f0',
                gridcolor: '#033',
                linecolor: '#0f0'
              },
              radialaxis: {
                range: [0, 150], // Діапазон до 150 км
                tickcolor: '#0f0',
                gridcolor: '#033',
                linecolor: '#0f0'
              }
            },
            showlegend: false
          }}
        />
      </div>

      {/* Панель керування */}
      <div style={{ width: '300px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Панель керування</h3>
        
        <label style={{ display: 'block', marginBottom: '10px' }}>
          Вимірювань на оберт (1-360):
          <input type="number" name="measurementsPerRotation" value={config.measurementsPerRotation} onChange={handleConfigChange} style={{ width: '100%' }} />
        </label>
        
        <label style={{ display: 'block', marginBottom: '10px' }}>
          Швидкість обертання (RPM 0.1-60):
          <input type="number" name="rotationSpeed" value={config.rotationSpeed} onChange={handleConfigChange} style={{ width: '100%' }} />
        </label>
        
        <label style={{ display: 'block', marginBottom: '10px' }}>
          Кількість цілей (1-50):
          <input type="number" name="numberOfTargets" value={config.numberOfTargets} onChange={handleConfigChange} style={{ width: '100%' }} />
        </label>
        
        <label style={{ display: 'block', marginBottom: '20px' }}>
          Швидкість цілей (км/год 0-20000):
          <input type="number" name="targetSpeed" value={config.targetSpeed} onChange={handleConfigChange} style={{ width: '100%' }} />
        </label>
        
        <button onClick={applyConfig} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Застосувати параметри
        </button>
      </div>
      
    </div>
  );
}