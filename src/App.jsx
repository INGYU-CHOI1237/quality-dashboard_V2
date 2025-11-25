import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Status from './pages/Status';
import Inkyu from './pages/Inkyu';

function App() {
    return (
        <Router>
            <Layout>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/status.html" element={<Status />} />
                    <Route path="/inkyu.html" element={<Inkyu />} />
                    <Route path="/index.html" element={<Dashboard />} />
                </Routes>
            </Layout>
        </Router>
    );
}

export default App;
