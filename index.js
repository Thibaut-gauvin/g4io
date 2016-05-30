/*****************************/
/*         Server            */
/*****************************/


/**
 * Define Food Object
 */
function Food(){}
Food.prototype.id       = 0;
Food.prototype.x        = 0;
Food.prototype.y        = 0;
Food.prototype.mass     = 0;
Food.prototype.color    = null;


/**
 * Define hiddenArea Object
 */
 function HideArea(){}
HideArea.prototype.id       = 0;
HideArea.prototype.x = 0;
HideArea.prototype.y = 0;
HideArea.prototype.mass = 0;
HideArea.prototype.color = "#2d8e1c";




/**
 * Define Player Object
 *
 * @param socket
 */
function Player(socket)
{
    this._init(socket);
}

Player.prototype.logged = false;
Player.prototype.socket = null;
Player.prototype.name   = null;
Player.prototype.x      = 0;
Player.prototype.y      = 0;
Player.prototype.color  = null;
Player.prototype.type   = 0;
Player.prototype.mass   = 10;
Player.prototype.id     = 0;
Player.prototype.visible = true;

/**
 * Init Player
 *
 * @param socket
 */
Player.prototype._init = function(socket)
{
    this.logged             = false;
    this.socket             = socket;

    var gameServer          = GameServer.getInstance();
    gameServer.lastPlayerId = gameServer.lastPlayerId + 1;
    this.id                 = gameServer.lastPlayerId;

    this.socket.once("login", this._loginHandler.bind(this) );
    this.socket.on("set_player_data", this._setDataHandler.bind(this) );
    this.socket.emit("require_login", this.getState());
};

/**
 * Handle set_player_data event emitted by Players
 *
 * @param data
 * @private
 */
Player.prototype._setDataHandler = function(data)
{
    this.time   = Date.now();
    this.mass   = data.mass;
    this.speed   = data.speed;
    this.name   = data.name;
    this.x      = data.x;
    this.y      = data.y;
    this.color  = data.color;
    this.logged = true;
    this.visible = data.visible;
};

/**
 * Handle new player connection
 *
 * @param data
 */
Player.prototype._loginHandler = function(data)
{
    var gameServer  = GameServer.getInstance();
    this.time       = Date.now();
    this.mass       = data.mass;
    this.speed       = data.speed;
    this.name       = data.name;
    this.x          = data.x;
    this.y          = data.y;
    this.color      = data.color;
    this.logged     = true;
    this.visible     = data.visible;

    this.socket.on('collide_food', gameServer._collideFoodHandler.bind(gameServer));
    this.socket.on('collide_player', gameServer._collidePlayerHandler.bind(gameServer));
};

/**
 * Return player properties to client
 *
 * @returns { { x: *, y: *, color: *, name: *, mass: *, id: * } }
 */
Player.prototype.getState       = function()
{
    return { x: this.x, y: this.y, color: this.color, name: this.name, mass: this.mass, id: this.id, visible: this.visible };
};

/**
 * When a user is set to inactive,
 * Disconnect player from socket & destroy Player object
 */
Player.prototype.destroy = function()
{
    this.socket.disconnect();
    this.logged = false;
    this.socket = null;
    this.name   = null;
    this.time   = 0;
    this.x      = 0;
    this.y      = 0;
    this.mass   = 0;
    this.speed   = 0;
    this.color  = null;
    this.id     = 0;
};




/**
 * Define GameServer Object
 */
function GameServer(){}

GameServer._instance                = null;
GameServer.prototype._server        = null;
GameServer.prototype._io            = null;
GameServer.prototype._refreshRate   = null;
GameServer.prototype._players       = null;
GameServer.prototype._foods         = null;
GameServer.prototype._hideAreas         = null;
GameServer.prototype.lastPlayerId   = 0;

/**
 * Return current GameServer instance if exist,
 * Create new one if not.
 *
 * @returns {null|*|GameServer}
 */

GameServer.getInstance                  = function(){
    GameServer._instance = GameServer._instance || new GameServer();
    return GameServer._instance;
};

/**
 * Refresh game data
 */
GameServer.prototype.refresh            = function()
{
    var timestamp   = Date.now();
    var inactives   = [];
    var data        = { players: [], food: this._foods, hideAreas: this._hideAreas };
    var i           = this._players.length;
    var current     = null;

    while( --i > -1 )
    {
        current = this._players[i];
        if( current.logged == false )
            continue;

        data.players.push( current.getState() );

        if( timestamp - current.time > 5000 )
        {
            current.logged = false;
            inactives.push(current);
        }
    }

    if( current != null )
    {
        // On envoie au joueur courant l'état de tout les joueurs.
        current.socket.emit('refresh_world', data);

        // On envoie à tout les autres la même chose, par le biais de la propriété broadcast
        current.socket.broadcast.emit('refresh_world', data);
    }

    i = inactives.length;

    while( --i > -1)
    {
        current = inactives[i];
        this._players.splice( this._players.indexOf( current ), 1);
        current.destroy();
        current = null;
    }

    setTimeout( this.refresh.bind(this), this._refreshRate);
};

/**
 * Generate new random foods items and send them to client
 *
 * @param nb
 * @returns { Array }
 */
GameServer.prototype._generateFood               = function(nb)
{
    var foods = [];
    while( --nb > -1 )
    {
        var food    = new Food();
        food.x      = ( Math.random() * 800 ) >> 0;
        food.y      = ( Math.random() * 600 ) >> 0;
        food.mass   = 10;
        food.color  = '#'+parseInt( Math.random() * 0xFFFFFF ).toString(16);
        food.id     = nb;

        foods.push(food);
    }

    return foods;
};


/**
 * Generate new random hide areas items and send them to client
 *
 * @param nb
 * @returns { Array }
 */
GameServer.prototype._generateHideArea               = function(nb)
{
    var hideAreas = [];
    while( --nb > -1 )
    {
        var hideArea    = new HideArea();
        hideArea.x      = ( Math.random() * 800 ) >> 0;
        hideArea.y      = ( Math.random() * 600 ) >> 0;
        hideArea.mass   = 50;
        hideArea.color  = "#2d8e1c";
        // hideArea.id     = nb;

        hideAreas.push(hideArea);
    }

    return hideAreas;
};



/**
 * Init Game
 */
GameServer.prototype.init                       = function()
{
    var express         = require('express');
    var app             = express();
    var socketio        = require('socket.io');
    var port            = 3000;

    this._players       = [];
    this._server        = require('http').createServer(app);
    this._refreshRate   = 40;

    this._server.listen(port, function () {
        console.log('Server listening at port %d', port);
    });

    this._io = socketio.listen(this._server);
    this._io.sockets.on('connection', this._connectHandler.bind(this) );

    app.get('/', this._serveHomePage);
    app.use(express.static(__dirname + '/'));

    this._foods = this._generateFood(80);
    this._hideAreas = this._generateHideArea(10);
    this.refresh();
};


/**
 * Send Home Page to visitor
 *
 * @param req
 * @param res
 */
GameServer.prototype._serveHomePage             = function(req, res)
{
    res.sendFile(__dirname + '/index.html');
};

/**
 * Handle connection to server
 *
 * @param socket
 */
GameServer.prototype._connectHandler            = function(socket)
{
    this._players.push( new Player(socket) );
};

/**
 * Handle Collision between player & foods
 *
 * @param foodId
 */
GameServer.prototype._collideFoodHandler        = function(foodId)
{
    var i = this._foods.length;

    var current = null;
    while( --i > -1 )
    {
        current = this._foods[i];
        if( current.id == foodId )
        {
            current.x = parseInt(Math.random() * 800);
            current.y = parseInt(Math.random() * 600);
        }
    }
};

/**
 * Handle Collision between player & other players
 *
 * @param playerId
 */
GameServer.prototype._collidePlayerHandler      = function(playerId)
{
    var i = this._players.length;

    var current = null;
    while( --i > -1 )
    {
        current = this._players[i];
        if( current.id == playerId)
        {
            current.socket.disconnect();
            this._players.splice( this._players.indexOf( current ), 1);
            current.destroy();
        }
    }
};

/**
 * Start game
 */
GameServer.getInstance().init();