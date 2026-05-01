const axios = require('axios');
async function test() {
    try {
        const res = await axios.post('http://localhost:3000/api/chat', { message: 'When is election day?' });
        console.log("Chatbot Reply:", res.data.reply);
    } catch (e) {
        console.log("Error:", e.response ? e.response.data : e.message);
    }
}
test();
