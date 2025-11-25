import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
    const [title, setTitle] = useState('Quality Dashboard');

    useEffect(() => {
        switch (location.pathname) {
            case '/status.html':
                setTitle('Status');
                break;
            case '/inkyu.html':
                setTitle('Inkyu Choi');
                break;
            default:
                setTitle('Quality Dashboard');
        }
    }, [location]);

    return (
        <>
            <header className="main-header">
                <img src="/mersen_logo.png" alt="Mersen Logo" className="header-logo" />
                <h1>{title}</h1>

                <div className="header-menu">
                    <span className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>Menu ▼</span>
                    <div className="menu-content" style={{ display: isMenuOpen ? 'block' : 'none' }}>
                        <Link to="/" onClick={() => setIsMenuOpen(false)}>Quality Dashboard</Link>
                        <Link to="/inkyu.html" onClick={() => setIsMenuOpen(false)}>Inkyu Choi</Link>
                        <Link to="/status.html" onClick={() => setIsMenuOpen(false)}>Status</Link>
                    </div>
                </div>
            </header>
            {children}
        </>
    );
};

export default Layout;
