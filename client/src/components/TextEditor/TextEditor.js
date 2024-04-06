import React, { useCallback, useEffect, useState } from 'react';
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { io } from 'socket.io-client';
import { useNavigate, useParams } from 'react-router-dom';
import QuillCursors from 'quill-cursors';
import axios from 'axios';
import Cookies from 'js-cookie';
import "../../styles/styles.css";

Quill.register('modules/cursors', QuillCursors);

const SAVE_INTERVAL_MS = 2000;

const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: []} ],
    [{ list: "ordered" },  { list: "bullet" }],
    ["bold", "italic", "underline"],
    [{ color: [] }, { background: [] }],
    [{ script: "sub" }, { script: "super" }],
    [{ align: [] }],
    ["image", "blackquote", "code-block"],
    ["clean"]
];

function TextEditor() {
    const [socket, setSocket] = useState()
    const [quill, setQuill] = useState()
    const { id: documentId} = useParams();
    // Add state for active users
    const [activeUsers, setActiveUsers] = useState([]);
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const accessToken = Cookies.get('accessToken'); // Read accessToken from cookies
    const refreshToken = Cookies.get('refreshToken'); // Read refreshToken from cookies

    useEffect(() => {
      if (!accessToken || !refreshToken) {
          navigate('/login');
        }
        // eslint-disable-next-line
    }, [accessToken, refreshToken]);
  

    // console.log(`DocumentID - ${documentId}`);

    useEffect(() => {
        const s = io("http://localhost:3001")
        setSocket(s);
        return () => {
            s.disconnect();
        }
    }, []);

    useEffect(() => {
        if (!socket || !quill) return;
    
        // Handler for 'selection-change' event
        const selectionChangeHandler = (range, oldRange, source) => {
            if (range) {
                // Emit cursor position to the server
                socket.emit('cursor-position', { range, source });
            }
        };
    
        // // Listen for cursor updates from the server
        // const cursorUpdateHandler = ({ userId, range }) => {
        //     const cursors = quill.getModule('cursors');
        //     cursors.moveCursor(userId, range);
        // };
    
        // Attach the event handlers
        quill.on('selection-change', selectionChangeHandler);
        // socket.on('cursor-update', cursorUpdateHandler);
    
        // Cleanup function to remove event listeners
        return () => {
            quill.off('selection-change', selectionChangeHandler);
            // socket.off('cursor-update', cursorUpdateHandler);
        };
    }, [socket, quill]);



    useEffect(() => {
        if (!socket || !quill) return;
      
        const cursorUpdateHandler = ({ userId, range, color }) => {
            const cursors = quill.getModule('cursors');
            cursors.createCursor(userId, color, color); // Use the received color
            cursors.moveCursor(userId, range);
            cursors.update();

            // Update activeUsers by appending the new user
            setActiveUsers(prevUsers => {
                // Check if the user already exists in activeUsers
                const userExists = prevUsers.some(user => user.userId === userId);
                if (!userExists) {
                    // Append the new user to activeUsers
                    return [...prevUsers, { userId, color }];
                }
                // Return the existing array if the user already exists
                return prevUsers;
            });
            
            if(socket.id === userId){
                console.log(`MY COLOR IS - ${color}`);
            }
        };

      
        socket.on('cursor-update', cursorUpdateHandler);
      
        return () => {
          socket.off('cursor-update', cursorUpdateHandler);
        };
    }, [socket, quill]);

    useEffect(() => {
        if(!socket || !quill)
            return;
    
        const cursorRemoveHandler = ({userId, color}) => {
            const cursors = quill.getModule('cursors');
            cursors.removeCursor(userId);
            // Remove the user from activeUsers based on both userId and color
            setActiveUsers(prevUsers => prevUsers.filter(user => user.userId !== userId || user.color !== color));
        }

        socket.on('cursor-removed', cursorRemoveHandler);

        return () => {
            socket.off('cursor-removed', cursorRemoveHandler);
        }

    }, [socket, quill])

    useEffect(() => {
        if(socket == null || quill == null)
            return;

        const interval = setInterval(() => {
            socket.emit('save-document', quill.getContents());
        }, SAVE_INTERVAL_MS);

        return () => {
            clearInterval(interval);
        }

    }, [socket, quill]);

    useEffect(() => {
        if(socket == null || quill == null)
            return;
        
        socket.once('load-document', document => {
            quill.setContents(document);
            quill.enable();
        });

        socket.emit('get-document', documentId);

    }, [socket, quill, documentId])

    useEffect(() => {
        if(socket == null || quill == null)
            return;

        const handler = (delta) => {
            quill.updateContents(delta);
        }
        socket.on('receive-changes', handler)

        return () => {
            socket.off('receive-changes', handler);
        }
    }, [socket, quill])

    useEffect(() => {
        if(socket == null || quill == null)
            return;

        const handler = (delta, oldDelta, source) => {
            if(source !== 'user')
                return;
            socket.emit('send-changes', delta);
        }
        quill.on('text-change', handler)

        return () => {
            quill.off('text-change', handler);
        }
    }, [socket, quill])

    const wrapperRef = useCallback((wrapper) => {
        if(wrapper == null)
            return;

        wrapper.innerHTML = "";
        const editor = document.createElement('div');
        wrapper.append(editor);
        const q = new Quill(editor, {
            theme: "snow",
            modules: { 
                toolbar: TOOLBAR_OPTIONS,
                cursors: {
                    transformOnTextChange: true,
                },
            }
        });

        q.disable();
        q.setText('Loading....');

        setQuill(q);

    }, []);

    // console.log(`ACTiVE_USERS - ${activeUsers}`);

    // Function to logout the user on the frontend using Axios
    const logout = async () => {
        try {
            const accessToken = Cookies.get('accessToken');

            const response = await axios.post(
                'http://localhost:3001/api/user/logout',
                {},
                {
                    headers: { Authorization: `Bearer ${accessToken}` }
                },
                { withCredentials: true });
            if (response.status === 200) {
                // Clear user data in the frontend
                console.log('User logged out successfully');
                navigate('/login');
                // Redirect or perform any other action after logout
            } else {
                console.error('Logout failed:', response.data.error);
            }
        } catch (error) {
            console.error('Error logging out:', error);
            setError("Logout failed");
        }
    };
    
    // console.log(`ACTIVE USERS - ${activeUsers}`);
    console.log('ACTIVE USERS:');
    activeUsers.forEach((user, index) => {
        console.log(`User ${index + 1} - UserID: ${user.userId}, Color: ${user.color}`);
    });


    return (
      <>
        {error && <div>{error}</div>}
        <button className='logout-btn' onClick={logout}>Log OUT</button>
        <div className="container" ref={wrapperRef}></div>
        {/* <div>
          <h3>Active Users:</h3>
          <ul>
            {activeUsers.map((userId, index) => (
              <li key={index}>User ID: {userId}</li>
            ))}
          </ul>
        </div> */}
        <div>
        <h3>Active Users:</h3>
        <ul>
            {activeUsers.map((user, index) => (
            <li key={index} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                backgroundColor: user.color,
                width: '3cm', // Adjust the width as needed
                height: '20px', // Adjust the height as needed
                marginRight: '10px' // Add some space between the bar and the user ID
                }}></div>
                User ID: {user.userId}, Color: {user.color}
            </li>
            ))}
        </ul>
        </div>


      </>
    );
}

export default TextEditor