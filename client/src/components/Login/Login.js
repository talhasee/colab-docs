import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { v4 as uuidV4 } from 'uuid';
import Cookies from 'js-cookie';
import "../../styles/styles.css";


// Configure Axios to send cookies with every request
axios.defaults.withCredentials = true;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3001/api/user/login', { email, password });
      const data = response.data.data;
      if(Cookies.get('accessToken')){
        Cookies.remove('accessToken');
      }
      if(Cookies.get('refreshToken')){
        Cookies.remove('refreshToken');
      }
      const accessToken = data.accessToken;
      const refreshToken = data.refreshToken;

      Cookies.set('accessToken', accessToken);
      Cookies.set('refreshToken', refreshToken);
      navigate(`/documents/${uuidV4()}`);
    } catch (error) {
      console.error('Login error:', error);
      setError('Invalid credentials');
    }
  };

  const toRegister = () => {
    navigate('/register');
  }

    return (
        <div className="login-container">
            <h1 className='login-heading'>Login</h1>
            {error && <div>{error}</div>}
            <form onSubmit={handleLogin}>
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="submit">Login</button>
            </form>
            <button className='login-register' onClick={toRegister} to="/register">Register</button>
        </div>
    );
};

export default Login;
