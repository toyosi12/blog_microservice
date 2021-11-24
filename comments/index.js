const express = require('express');
const app = express();
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

app.use(express.json());
app.use(cors());
const commentsByPostId = {};

app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || [])
});

app.post('/posts/:id/comments', async (req, res) => {
    const { content } = req.body;
    const postId = req.params.id;
    const comments = commentsByPostId[postId] || [];
    const commentId = randomBytes(4).toString('hex');
    comments.push({
        id: commentId,
        content,
        status: 'pending'
    });

    await axios.post('http://event-bus-srv:4005/events', {
        type: 'commentCreated',
        data: {
            id: commentId,
            content,
            postId,
            status: 'pending'
        }
    })
    commentsByPostId[postId] = comments;

    res.status(201).send(commentsByPostId[postId])
});

app.post('/events', async (req, res) => {
    console.log('Received event: ', req.body.type);

    const {type, data} = req.body;

    if(type === 'commentModerated'){
        const {postId, id, status, content} = data;

        const comments = commentsByPostId[postId];
        const comment = comments.find(comment => {
            return comment.id === id;
        });
        comment.status = status;
        await axios.post('http://event-bus-srv:4005/events', {
            type: 'commentUpdated',
            data: {
                id,
                status,
                postId,
                content
            }
        })
    }
    res.send({});
})


app.listen(4001, ()=>{
    console.log('Listening on port 4001');
})
