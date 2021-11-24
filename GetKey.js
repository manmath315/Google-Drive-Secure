const crypto=require('crypto')

module.exports.findKey=function(userKey)
{
    return crypto.createHash('sha256').update(userKey).digest()
}