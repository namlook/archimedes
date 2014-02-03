

NeDB = () ->
    Database = new require('../nedb/database')
    return new Database()

module.exports = {
    Database: NeDB
}