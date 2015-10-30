require('dotenv').load();
var swig = require('swig');
var collections = ['merchants', 'DEALSBOX_deals'];
var db = require("mongojs").connect(process.env.DEALSBOX_MONGODB_URL, collections);
var randtoken = require('rand-token');
var fs = require('fs');
var path = require('path');
var s3 = require('s3');
var http = require('http');
var https = require('https');
var _request = require('request');
var querystring = require('querystring');

http.globalAgent.maxSockets = https.globalAgent.maxSockets = 20;
var yelp = require("yelp").createClient({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  token: process.env.TOKEN,
  token_secret: process.env.TOKEN_SECRET
});

var s3_client = s3.createClient({
  s3Options: {
    accessKeyId: process.env.AMAZON_ACCESS_KEY_ID,
    secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY
  },
});

var uploadToAmazon = function (file, file_name) {

  var params = {
    localFile: file,

    s3Params: {
      Bucket: "dealsbox",
      Key: file_name,
      Expires: 60,
      ACL: 'public-read'
    },
  };
  var uploader = s3_client.uploadFile(params);

  return uploader;
};

var getYelpId = function (url) {
  var businessUrlOnYelp = url,
    businessUrlOnYelpLength;
  businessUrlOnYelp = businessUrlOnYelp.split('?')[0];
  businessUrlOnYelp = businessUrlOnYelp.split('/');
  businessUrlOnYelpLength = businessUrlOnYelp.length;
  return businessUrlOnYelp[businessUrlOnYelpLength - 1];
};


module.exports = {
  index: {
    handler: function (request, reply) {

      if (!request.auth.isAuthenticated) {
        return reply.redirect('/business/login');
      }

      reply.view('merchant/add_deal', {
        _class: 'login-page',
        business_email: request.auth.credentials.business_email,
        yelp_URL: request.auth.credentials.yelp_URL,
        business_name: request.auth.credentials.business_name,
        business_id: request.auth.credentials.business_id,
      });

    },
    auth: 'session'
  },

  builder: {
    payload: {
      output: 'stream',
      parse: true,
      allow: 'multipart/form-data'
    },
    handler: function (request, reply) {
      console.log(request.payload);

      var deal_id = '';
      deal_id = randtoken.generate(12);
      var payload = request.payload;
      var yelpBizId = getYelpId(payload.yelp_URL);
      var offer;
      var uploader;

      if (payload.nonhumans.length === 0) {
        var start_date = request.payload.deal_date.split('-')[0];
        var end_date = request.payload.deal_date.split('-')[1];
        var d = new Date();
        var insert_date = d.toISOString();

        if (payload.discount_type === '%') {
          offer = payload.discount_value + payload.discount_type + ' Off';
        }
        if (payload.discount_type === '$') {
          offer = payload.discount_type + payload.discount_value + ' Off';
        }

        yelp.business(yelpBizId, function (error, data) {
          if (error) reply(error);

          var deal = {
            insert_date: insert_date,
            coupon: "yes",
            offer: offer,
            coupon_code: payload.coupon_code,
            deal_id: deal_id,
            loc: {
              type: "Point",
              coordinates: [data.location.coordinate.longitude,
                data.location.coordinate.latitude
              ]
            },
            title: payload.title,
            provider_name: "DEALSBOX",
            merchant_locality: data.location.city,
            merchant_name: data.name,
            merchant_id: payload.business_id,
            large_image: "",
            description: payload.description,
            fine_print: payload.fine_print,
            expires_at: end_date.trim(),
            published: payload.publish,
            start_date: start_date.trim(),
            phone: data.display_phone,
            category_name: payload.category,
            quantity_bought: '',
            old_price: '',
            url: 'http://dealsbox.co/',
            small_image: data.image_url,
            merchant_address: data.location.display_address,
            zip_code: data.location.postal_code,
            Yelp_rating: data.rating,
            Yelp_categories: data.categories,
            Yelp_reviews: data.reviews
          };
          if (payload.file) {
            var filename = payload.file.hapi.filename;
            filename = deal_id + path.extname(filename);
            var imagePath = appRoot + "/deal_images/" + filename;
            var file = fs.createWriteStream(imagePath);

            // begin amazon image upload processing
            payload.file.pipe(file);
            //stream.pipe(res);

            file.on('close', function () {
              uploader = uploadToAmazon(imagePath, deal_id);

              uploader.on('error', function (err) {
                console.error("unable to upload:", err.stack);
              });
              uploader.on('progress', function () {
                console.log("progress", uploader.progressMd5Amount,
                  uploader.progressAmount, uploader.progressTotal);
              });
              uploader.on('end', function () {
                fs.unlinkSync(imagePath);
                deal.large_image = 'https://s3.amazonaws.com/dealsbox/' + deal_id;
                db.DEALSBOX_deals.save(deal, function () {
                  reply('deal has been saved');
                });
              });
            });
          }

        });
      }


    }
  },

  yelp: {
    handler: function (request, reply) {
      yelp.business(getYelpId(request.query.yelp_URL), function (error, data) {
        console.log(error);
        reply(data);
      });
    }
  },

  deals: {
    handler: function (request, reply) {
      db.DEALSBOX_deals.find({
        merchant_id: request.auth.credentials.business_id
      }, function (err, deals) {
        reply.view('merchant/manage_deals', {
          deals: deals
        });
      });
    },
    auth: 'session'
  }
};