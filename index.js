const Discord = require('discord.js');
const fs = require('fs');
const readline = require('readline');

const LonaDB = require('lonadb-client');

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

const Bot = class{
    constructor(token){
        this.client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'], intents: [
            Discord.GatewayIntentBits.DirectMessages,
            Discord.GatewayIntentBits.GuildMessages,
            Discord.GatewayIntentBits.MessageContent
        ]});
        this.config = {};

        this.lona;

        this.startup();
    }

    startup = async function() {
        console.log("Loading Config"); //Load config from config.json file
        this.config = await JSON.parse(await fs.readFileSync('./config.json'));

        //create a connection to the database
        this.lona = new LonaDB(this.config.database.host, this.config.database.port, this.config.database.username, this.config.database.password);

        //try obtaining the token
        try{
            let token = await this.lona.get(this.config.database.table, "Token");

            if(typeof(token) === typeof({})) { //token is missing
                if(token.err === "variable_undefined" || token.err === "table_invalid") return this.setup();
            }

            this.client.login(token); //token exists => log in
        }
        catch(e){
            console.log(e); //error
        }
    }

    setup = async function(){
        let token = await askQuestion("What is your Bot Token? \n");

        let tables = await this.lona.getTables(); //obtain a list of all tables in the database

        let tableExists = false;

        await tables.forEach(tableName => { //check if table exists
            if(tableName === this.config.database.table) return tableExists = true;
        });

        //table exists => define Token variable in database table
        if(tableExists) await this.lona.set(this.config.database.table, "Token", token);

        else { //table doesn't exist => create it and define Token variable
            await this.lona.createTable(this.config.database.table);
            await this.lona.set(this.config.database.table, "Token", token);
        }

        this.client.login(token);
    }
}

const bot = new Bot();