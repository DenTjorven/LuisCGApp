import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  const changeRoute = (path) => {
    navigate(path);
  };

  return (
    <div>
      <h1>Easter Egg, under construction</h1>
      <button onClick={() => changeRoute("/database")}>
        Go to Database
      </button>
    </div>
  );
};

export default Home;