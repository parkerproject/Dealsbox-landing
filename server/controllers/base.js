// This is the base controller. Used for base routes, such as the default index/root path, 404 error pages, and others.
require('dotenv').load()
var swig = require('swig')

module.exports = {
  index: {
    handler: function (request, reply) {
      reply.view('index', {
        title: ''
      })

    },
    app: {
      name: 'index'
    }
  },
  fbconfirm: {
    handler: function (request, reply) {
      reply.view('fbconfirm', {
        title: 'Thank you'
      })
    },
    app: {
      name: 'fbconfirm'
    }
  },
  missing: {
    handler: function (request, reply) {
      reply.view('404', {
        title: 'You found a missing page, but won the 404 error!'
      }).code(404)
    },
    app: {
      name: '404'
    }
  },
  business: {
    handler: function (request, reply) {
      return reply.redirect('https://merchant.dealsbox.co')
    },
    app: {
      name: 'business'
    }
  }
}