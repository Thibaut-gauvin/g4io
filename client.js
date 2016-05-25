function Player(){}

Player.prototype.name 			= null;
Player.prototype.color			= '#000000';
Player.prototype.x 				= 0;
Player.prototype.y 				= 0;
Player.prototype.logged 		= false;
Player.prototype.mass 			= 10;

Player.prototype.getState		= function()
{
    return { x: this.x, y: this.y, color: this.color, name: this.name, mass: this.mass };
};


function Application(){}

Application.prototype._serverIP = 0;
Application.prototype._socket   = null;
Application.prototype._player   = null;
Application.prototype._canvas   = null;
Application.prototype.mouseX    = 0;
Application.prototype.mouseY    = 0;


Application.prototype.init = function()
{
    this._player 		= new Player();
    this._player.name	= document.getElementById("nick").value;
    this._player.color	= document.getElementById("color").value;
    this._serverIP		= document.getElementById("server_ip").value;
    this._player.x 		= ( Math.random() * 200 ) >> 0;
    this._player.y 		= ( Math.random() * 200 ) >> 0;

    window.addEventListener("keyup", this._keyHandler.bind(this) );

    this._canvas		= document.getElementById('game');
    this._canvas.addEventListener( "mousemove", this._overHandler.bind(this) );

    var port = 3000;
    this._socket = io.connect(this._serverIP + ':' + port);
    console.log('client connection to: ' + this._serverIP + ' on port: ' + port);

    this._socket.on('require_login', this._requireLoginHandler.bind(this) );
    this._socket.on('refresh_world', this._refreshHandler.bind(this) );
};

Application.prototype.checkCollisions = function(entities)
{
    var distX 		= 0;
    var distY 		= 0;
    var dist		= 0;
    var currentX 	= this._player.x;
    var currentY 	= this._player.y;
    var dist 		= 0;
    var i 			= entities.length;
    var entity 		= null;

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
        }

    }
};

Application.prototype._refreshHandler = function(data)
{
    var players 	= data.players;
    var food		= data.food;
    var i 			= 0;
    var canvas 		= this._canvas;
    var current		= null;
    var context 	= canvas.getContext("2d");
    var radius		= 0;

    context.clearRect(0,0,canvas.width, canvas.height );


    this.checkCollisions(data.food);

    i = food.length;

    while( --i > -1 )
    {

        current = food[i];
        radius = current.mass / 2;
        context.save();
        context.translate(current.x, current.y);
        context.beginPath();
        context.fillStyle = current.color;
        context.arc( 0, 0, radius, 0, Math.PI * 2 );
        context.fill();
        context.restore();
    }

    i = players.length;

    while( --i > -1 )
    {
        current = players[i];
        radius = ( current.mass >> 1 );

        context.save();
        context.translate(current.x, current.y);
        context.beginPath();
        context.fillStyle = current.color;
        context.arc( 0, 0, radius, 0, Math.PI * 2 );
        context.fill();
        context.restore();
    }
};

Application.prototype._keyHandler		= function()
{
    this._player.mass += 5;
};

Application.prototype._requireLoginHandler = function(data)
{
    this._socket.emit("login", this._player);
    this._player.logged = true;
    this._render();
};

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

Application.prototype._render = function()
{
    if( this._player.logged == true )
    {
        this._player.x += parseInt( ( this.mouseX - this._player.x ) * 0.1 );
        this._player.y += parseInt( ( this.mouseY - this._player.y ) * 0.1 );
        this._socket.emit('set_player_data', this._player.getState());
    }

    setTimeout(this._render.bind(this),1000/60);
};



function run()
{
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("connectBtn").removeEventListener("click", run);
    var app = new Application();
    app.init();
}

window.onload = function()
{
    document.getElementById("connectBtn").addEventListener("click", run);
};
