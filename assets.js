// assets to be used by the 'hapi-assets' module based on process.env.NODE_ENV
module.exports = {
    development: {
        js: ['js/jquery.min.js', 'js/sweet-alert.js', 'js/scripts.js'],
        css: ['css/animate.css', 'css/normalize.css', 'css/skeleton.css', 'css/sweet-alert.css', 'css/app.css']
    },
    production: {
        js: ['js/scripts.min.js'],
        css: ['css/app.min.css']
    }
};