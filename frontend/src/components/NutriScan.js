import React, { useState, useRef } from 'react';
import Sidebar from './Sidebar';

const NutriScan = () => {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    loadPopularProducts();
  }, []);

  const loadPopularProducts = async () => {
    try {
      const response = await fetch('/api/nutriscan/popular');
      const result = await response.json();
      if (result.success) {
        setPopularProducts(result.products);
      }
    } catch (error) {
      console.error('Error loading popular products:', error);
    }
  };

  const handleBarcodeInput = async (barcode) => {
    if (!barcode || barcode.length < 8) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/nutriscan/barcode/${barcode}`);
      const result = await response.json();
      
      if (result.success) {
        setScanResult(result.nutrition);
      } else {
        alert('Product not found in nutrition database');
      }
    } catch (error) {
      alert('Error scanning barcode');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/nutriscan/search?q=${encodeURIComponent(searchQuery)}`);
      const result = await response.json();
      
      if (result.success) {
        setSearchResults(result.products);
      }
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectProduct = (product) => {
    setScanResult(product);
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="nutriscan-page">
      <div className="dashboard-container">
        <Sidebar currentPage="nutriscan" />
        
        <div className="main-content">
          <div className="page-header">
            <h1 className="page-title">🔍 NutriScan</h1>
            <p className="page-subtitle">Scan barcodes or search for nutrition information</p>
          </div>

          {/* Scan Options */}
          <div className="scan-options">
            <div className="scan-card">
              <h3>📱 Barcode Scanner</h3>
              <p>Enter barcode number to get nutrition info</p>
              <div className="barcode-input">
                <input 
                  type="text" 
                  placeholder="Enter barcode (e.g., 1234567890123)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleBarcodeInput(e.target.value);
                    }
                  }}
                />
                <button onClick={() => {
                  const input = document.querySelector('.barcode-input input');
                  handleBarcodeInput(input.value);
                }}>
                  Scan
                </button>
              </div>
            </div>

            <div className="scan-card">
              <h3>🔍 Search Products</h3>
              <p>Search our nutrition database</p>
              <div className="search-input">
                <input 
                  type="text" 
                  placeholder="Search for food products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
                <button onClick={handleSearch}>Search</button>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="loading-section">
              <div className="loading-spinner"></div>
              <p>Scanning nutrition database...</p>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="search-results">
              <h3>Search Results</h3>
              <div className="products-grid">
                {searchResults.map((product, index) => (
                  <div key={index} className="product-card" onClick={() => selectProduct(product)}>
                    <div className="product-info">
                      <h4>{product.name}</h4>
                      <p>{product.brand}</p>
                      <div className="nutrition-preview">
                        <span>{product.calories} cal</span>
                        <span>{product.protein}g protein</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scan Result */}
          {scanResult && (
            <div className="scan-result">
              <h3>📊 Nutrition Information</h3>
              <div className="nutrition-card">
                <div className="product-header">
                  <h4>{scanResult.name}</h4>
                  <p>{scanResult.brand}</p>
                </div>
                
                <div className="nutrition-facts">
                  <div className="nutrition-row">
                    <span>Calories</span>
                    <span>{scanResult.calories}</span>
                  </div>
                  <div className="nutrition-row">
                    <span>Protein</span>
                    <span>{scanResult.protein}g</span>
                  </div>
                  <div className="nutrition-row">
                    <span>Carbohydrates</span>
                    <span>{scanResult.carbs}g</span>
                  </div>
                  <div className="nutrition-row">
                    <span>Fat</span>
                    <span>{scanResult.fat}g</span>
                  </div>
                  <div className="nutrition-row">
                    <span>Fiber</span>
                    <span>{scanResult.fiber}g</span>
                  </div>
                  <div className="nutrition-row">
                    <span>Sugar</span>
                    <span>{scanResult.sugar}g</span>
                  </div>
                  <div className="nutrition-row">
                    <span>Sodium</span>
                    <span>{scanResult.sodium}mg</span>
                  </div>
                </div>

                <div className="action-buttons">
                  <button className="btn btn-primary" onClick={() => {
                    // Add to nutrition log
                    const nutritionData = {
                      meals: [{
                        name: scanResult.name,
                        calories: scanResult.calories,
                        protein: scanResult.protein,
                        carbs: scanResult.carbs,
                        fat: scanResult.fat
                      }],
                      totalCalories: scanResult.calories,
                      totalProtein: scanResult.protein,
                      totalCarbs: scanResult.carbs,
                      totalFat: scanResult.fat
                    };

                    fetch('/api/nutrition', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(nutritionData)
                    })
                    .then(res => res.json())
                    .then(result => {
                      if (result.success) {
                        alert('✅ Added to nutrition log!');
                      } else {
                        alert('❌ Failed to add to log');
                      }
                    });
                  }}>
                    📝 Add to Log
                  </button>
                  <button className="btn btn-outline" onClick={() => setScanResult(null)}>
                    🔍 Scan Another
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Popular Products */}
          {!scanResult && !searchResults.length && (
            <div className="popular-products">
              <h3>🔥 Popular Products</h3>
              <div className="products-grid">
                {popularProducts.map((product, index) => (
                  <div key={index} className="product-card" onClick={() => selectProduct(product)}>
                    <div className="product-info">
                      <h4>{product.name}</h4>
                      <p>{product.brand}</p>
                      <div className="nutrition-preview">
                        <span>{product.calories} cal</span>
                        <span>{product.protein}g protein</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .nutriscan-page {
          min-height: 100vh;
          background: radial-gradient(ellipse at top, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          color: white;
        }

        .scan-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .scan-card {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          padding: 30px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .scan-card h3 {
          margin-bottom: 10px;
          color: #6C63FF;
        }

        .barcode-input, .search-input {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }

        .barcode-input input, .search-input input {
          flex: 1;
          padding: 12px;
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
          color: white;
        }

        .barcode-input button, .search-input button {
          padding: 12px 20px;
          background: #6C63FF;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
        }

        .product-card {
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .product-card:hover {
          transform: translateY(-5px);
          background: rgba(255,255,255,0.15);
        }

        .nutrition-preview {
          display: flex;
          gap: 15px;
          margin-top: 10px;
          font-size: 0.9rem;
          color: #6C63FF;
        }

        .scan-result {
          margin-top: 30px;
        }

        .nutrition-card {
          background: rgba(255,255,255,0.1);
          padding: 30px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .nutrition-facts {
          margin: 20px 0;
        }

        .nutrition-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .action-buttons {
          display: flex;
          gap: 15px;
          margin-top: 20px;
        }

        .btn {
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: #6C63FF;
          color: white;
          border: none;
        }

        .btn-outline {
          background: transparent;
          color: #6C63FF;
          border: 1px solid #6C63FF;
        }

        .loading-section {
          text-align: center;
          padding: 40px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top: 3px solid #6C63FF;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NutriScan;