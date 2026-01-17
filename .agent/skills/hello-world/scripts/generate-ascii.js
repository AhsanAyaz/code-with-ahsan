const figlet = require('figlet');

const text = process.argv[2] || 'Hello World';

figlet(text, function(err, data) {
    if (err) {
        console.log('Something went wrong...');
        console.dir(err);
        return;
    }
    console.log(data);
});
