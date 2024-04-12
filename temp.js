const fetchRegisterUser = async () => {
    const url = 'https://colab-docs.vercel.app/register'; // Replace 'your-api-url' with your actual API endpoint

    const requestBody = {
        email: 'example@example.com',
        password: 'password123'
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log(data); // Log the response data

    } catch (error) {
        console.error('Error:', error);
    }
};

// Call the fetchRegisterUser function to send the POST request
fetchRegisterUser();