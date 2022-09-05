const { secret } = require('../../config.json');
const jwt = require('jsonwebtoken');
const User = require("./User");

module.exports = {
    getUser,
    generateJwtToken,
    basicDetails
};

async function getUser(_id) {
    const user = await User.findById(_id);
    if (user){
        return basicDetails(user);
    }
}

function generateJwtToken(user) {
    return jwt.sign({ sub: user._id, _id: user._id }, secret, { expiresIn: '10d' });
}

function basicDetails(user) {
    const { id, username, email, posts, work } = user;
    return { id, username, email, posts, work };
}