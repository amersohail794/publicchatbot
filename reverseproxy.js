const proxy = require('redbird')({port: process.env.PORT || 5000});

proxy.register("obscure-harbor-15450.herokuapp.com", "http://94.200.209.170:10002");