/*****************************/
/*         Client            */
/*****************************/


/**
 * Define Player Object
 */
function Player(){}

Player.prototype.name           = null;
Player.prototype.color          = '#000000';
Player.prototype.x              = 0;
Player.prototype.y              = 0;
Player.prototype.logged         = false;
Player.prototype.mass           = 10;
Player.prototype.id             = 0;
Player.prototype.speed 			= 1;

/**
 * Return player properties to server
 */
Player.prototype.getState       = function()
{
    return { x: this.x, y: this.y, color: this.color, name: this.name, mass: this.mass, id:this.id };
};





/**
 * Define Application Object
 */
function Application(){}

Application.prototype._serverIP     = 0;
Application.prototype._socket       = null;
Application.prototype._refreshRate  = null;
Application.prototype._player       = null;
Application.prototype._canvas       = null;
Application.prototype.mouseX        = 0;
Application.prototype.mouseY        = 0;
Application.prototype.lastPlayerId  = 0;

/**
 * Init Application
 *
 * Create new player object & hydrate them
 * Bind mousemove event
 * Create new socket & connect them to server
 * Listen require_login & refresh_world event
 */
Application.prototype.init                      = function()
{
    this._player        = new Player();
    this._player.name   = document.getElementById("nick").value;
    this._player.color  = document.getElementById("color").value;
    this._serverIP      = document.getElementById("server_ip").value;
    this._player.x      = ( Math.random() * 200 ) >> 0;
    this._player.y      = ( Math.random() * 200 ) >> 0;
    this._canvas        = document.getElementById('game');
    this._port          = 3000;
    this._refreshRate   = 40;

    window.addEventListener("keyup", this._keyHandler.bind(this) );
    window.addEventListener("spacebar", this._splitPlayerHandler.bind(this) );
    this._canvas.addEventListener( "mousemove", this._overHandler.bind(this) );

    this._socket = io.connect(this._serverIP + ':' + this._port );

    this._socket.on('require_login', this._requireLoginHandler.bind(this) );
    this._socket.on('refresh_world', this._refreshHandler.bind(this) );
};

/**
 * Check if player collide with some foods
 *
 * @param entities
 */
Application.prototype.checkCollisionsFood       = function(entities)
{
    var distX       = 0;
    var distY       = 0;
    var dist        = 0;
    var currentX    = this._player.x;
    var currentY    = this._player.y;
    var i           = entities.length;
    var entity      = null;

    while( --i > -1 )
    {
        entity = entities[i];

        distX = ( entity.x - currentX ) * ( entity.x - currentX );
        distY = ( entity.y - currentY ) * ( entity.y - currentY );

        dist = Math.sqrt( distX + distY );

        if( dist <= ( this._player.mass >> 1 ) )
        {
            this._player.mass += parseInt(entity.mass / 10);
            this._socket.emit("collide_food", entity.id);
			this._player.speed /= 1.05;
        }
    }
};

/**
 * Check if player collide with other players
 *
 * @param entities
 */
Application.prototype.checkCollisionsPlayer     = function(entities)
{
    var distX       = 0;
    var distY       = 0;
    var dist        = 0;
    var currentX    = this._player.x;
    var currentY    = this._player.y;
    var i           = entities.length;
    var entity      = null;
    var eatAnotherPlayer = false ;


    while( --i > -1 ) {

        entity = entities[i];

        if(entity != null)
        {
            if (entity.id != this._player.id)
            {
                distX = ( entity.x - currentX ) * ( entity.x - currentX );
                distY = ( entity.y - currentY ) * ( entity.y - currentY );

                dist = Math.sqrt(distX + distY);

                if (dist <= ( this._player.mass >> 1 ))
                {
                    if( entity.mass * 1.20 <= this._player.mass )
                    {
                        eatAnotherPlayer = true ;
                    }

                    if(eatAnotherPlayer)
                    {
                        this._player.mass += parseInt(entity.mass / 10);
                        this._socket.emit("collide_player", entity.id);
                        eatAnotherPlayer = false;
                    }
                }
            }
        }
    }
};

/**
 * Refresh World data to canvas
 *
 * @param data
 */
Application.prototype._refreshHandler           = function(data)
{
    var players         = data.players;
    var foods           = data.food;
    var foodLength      = foods.length;
    var playerLength    = players.length;

    var canvas      = this._canvas;
    var current     = null;
    var context     = canvas.getContext("2d");
    var radius      = 0;

    context.clearRect(0,0,canvas.width, canvas.height );

    this.checkCollisionsFood(foods);
    this.checkCollisionsPlayer(players);

    while( --foodLength > -1 )
    {
        current = foods[foodLength];
        radius  = current.mass / 2;

        context.save();
        context.translate(current.x, current.y);
        context.beginPath();
        context.fillStyle = current.color;
        context.arc( 0, 0, radius, 0, Math.PI * 2 );
        context.fill();
        context.restore();
    }

    while( --playerLength > -1 )
    {
        current = players[playerLength];
        radius  = ( current.mass >> 1 );

        context.save();
        context.translate(current.x, current.y);
        context.beginPath();
        context.fillStyle = current.color;
        context.arc( 0, 0, radius, 0, Math.PI * 2 );
        context.fill();
        context.restore();
    }
};

/**
 * Debug method to grow up player mass when arrow up is press
 */
Application.prototype._keyHandler               = function()
{
    this._player.mass += 5;
};

/**
 * Split Player into multiple entity
 */
Application.prototype._splitPlayerHandler       = function()
{
    this._player
};

/**
 * Handle require_login event
 *
 * @param data
 */
Application.prototype._requireLoginHandler      = function(data)
{
    this._socket.emit("login", this._player);
    this._player.logged = true;
    this._player.id = data.id;
    this._render();
};

/**
 * Handle move of the mouse & move the player object
 *
 * @param event
 */
Application.prototype._overHandler = function(event)
{
    var bounds  = this._canvas.getBoundingClientRect();
    var x       = 0;
    var y       = 0;

    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    x = event.clientX - bounds.left;
    y = event.clientY - bounds.top;

    this.mouseX = x >> 0;
    this.mouseY = y >> 0;
};

/**
 * Send player position to server
 */
Application.prototype._render = function()
{
    if( this._player.logged == true )
    {
        this._player.x += parseInt( ( this.mouseX - this._player.x ) * 0.1 ) * this._player.speed;
        this._player.y += parseInt( ( this.mouseY - this._player.y ) * 0.1 ) * this._player.speed;
        this._socket.emit('set_player_data', this._player.getState());
    }

    setTimeout(this._render.bind(this), this._refreshRate);
};

/**
 * Start Application when user submit login form
 */
function run()
{
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("game").style.display = "block";

    document.getElementById("connectBtn").removeEventListener("click", run);
    var app = new Application();
    app.init();
}

/**
 * Listen login form submission
 */
window.onload = function()
{
    document.getElementById("connectBtn").addEventListener("click", run);
};
