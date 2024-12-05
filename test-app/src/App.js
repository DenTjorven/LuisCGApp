import './App.css';
import { Routes, Route } from 'react-router-dom';
import Database from './routes/Database';
import Home from './routes/Home';
import Draft from './routes/Draft';
import Navbar from './components/navigation/Navbar';
console.log(Navbar);
function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/database" element={<Database />} />
        <Route path="/draft" element={<Draft />} />
      </Routes>
    </>
  );
}

export default App;
