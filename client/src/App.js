import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import TextEditor from './components/TextEditor/TextEditor';
import Login from './components/Login/Login';
import Register from './components/Register/Register';
import "./styles/styles.css";
import { v4 as uuidV4 } from 'uuid';
import Cookies from 'js-cookie'; // Import Cookies from js-cookie

function App() {
 const [isLoggedIn, setIsLoggedIn] = useState(false);
 const accessToken = Cookies.get('accessToken'); // Read accessToken from cookies
 const refreshToken = Cookies.get('refreshToken'); // Read refreshToken from cookies

 useEffect(() => {
    // Check if the user is logged in
    const checkLoginStatus = () => {

      if (accessToken && refreshToken) {
        // console.log(`${typeof accessToken}, ${typeof refreshToken}`);
        // console.log(`${accessToken}, ${refreshToken}`);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    };

    checkLoginStatus();
    
 }, [accessToken, refreshToken]);

//  console.log(`IS logged in - ${isLoggedIn}`);

 return (
    <Router>
      <Routes>
        <Route path="/" element={isLoggedIn ? <Navigate to={`/documents/${uuidV4()}`} replace /> : <Login />} exact />
        <Route path="/documents/:id" element={<TextEditor />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
 );
}

export default App;
