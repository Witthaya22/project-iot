const knex = require('knex')({
    client: 'mysql',
    connection: {
      host: "202.29.230.252",
      port: 3306,
      user: "project",
      password: "123456",
      database: "test-sensor",
      
    },
  });
  
module.exports = knex;