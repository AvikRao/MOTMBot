const editJsonFile = require("edit-json-file");
const auth = require("./auth.json");
const Discord = require('discord.js');
const client = new Discord.Client();

// open JSON file for member properties
let file = editJsonFile(`${__dirname}/info.json`, {
    autosave: true
});

// listen for input in console in case I want to send a message manually
var stdin = process.openStdin(); 
stdin.addListener("data", function(d) {
   // note:  d is an object, and when converted to a string it will
   // end with a linefeed.  so we (rather crudely) account for that  
   // with toString() and then trim() 
   console.log("you entered: [" + 
     d.toString().trim() + "]");
     
   client.channels.get('504057505266270210').send(d.toString().trim());
   
});   

// Let console know the bot's started
client.on('ready', () => {
   console.log(`Logged in as ${client.user.tag}!`);
});

// When someone new joins the server
client.on('guildMemberAdd', gm => {
   gm.addRole(gm.guild.roles.find(role => role.name === "Memes")); // give them the starter role
   // add a new entry in users.json for the new member
   file.set("usercount", file.get("usercount") + 1);
   file.set(`user${file.get("usercount")}.id`, gm.id);
   file.set(`user${file.get("usercount")}.nickname`, gm.nickname);
   file.set(`user${file.get("usercount")}.points`, 0);
   // send a welcome message
   client.channels.get('504057505266270210').send(`${gm.user}, welcome to **${gm.guild.name}**! __Please visit__ #game-select __to set your roles and check out__ #announcements __for info about the server__.`);
});

// When someone sends a message
client.on('message', msg => {
   console.log(`Message sent in ${msg.channel.name} which has id ${msg.id} and content ${msg.content}.`); // Let console know someone's sent a message

   for (let i = 1; i <= file.get("usercount"); i++) {
      if (file.get(`user${i}.id`) == msg.author.id) {
         file.set(`user${i}.points`, file.get(`user${i}.points`) + 1);
         break;
      }
   }
   
   // If the message is a command
   if (msg.content.substring(0, file.get("prefix").length) == file.get("prefix")) {
      
      let firstspace = msg.content.indexOf(" ");
      let truefirstspace = firstspace;
      if (firstspace == -1) firstspace = msg.content.length;
      console.log(firstspace);
      switch (msg.content.substring(file.get("prefix").length, firstspace)) {
         
         case "points" :
            if (msg.mentions.members.size > 0) {
               for (let i = 1; i <= file.get("usercount"); i++) {
                  if (file.get(`user${i}.id`) == msg.mentions.members.first().id) {
                     msg.reply(`${msg.mentions.members.first().user.username} has ${file.get(`user${i}.points`)} points!`);
                     break;
                  }
               }
            } else {
               let userid = "";
               for (let i = 1; i <= file.get("usercount"); i++) {
                  if (file.get(`user${i}.id`) == msg.author.id) {
                     msg.reply(`you have ${file.get(`user${i}.points`)} points!`);
                     break;
                  }
               }
            }
            break;
         case "prefix" :
            if ( !msg.member.highestRole.name.toLowerCase().includes("memer") ) msg.reply("You are not an admin!");
            else if (truefirstspace == -1) msg.reply("You need to specify a new prefix!");
            else {
               file.set("prefix", msg.content.substring(firstspace).trim());
               msg.reply(`the new prefix is **${file.get("prefix")}**`)
                  .then(msg => console.log(`Prefix changed to ${file.get("prefix")}`))
                  .catch(console.error);
            }
            break;
            
         case "purge" :
            if ( !msg.member.highestRole.name.toLowerCase().includes("memer") ) msg.reply("You are not an admin!");
            else if (truefirstspace == -1) msg.reply("You need to specify an amount to purge!");
            else {
               let amount = parseInt(msg.content.substring(firstspace).trim());
               msg.channel.bulkDelete(amount + 1)
                  .then(msg => console.log(`Bulk deleted ${amount} messages`))
                  .catch(console.error)
            }
            break;
      }
   }
    
   // If they send a message in voting channel, delete it if it's not a valid meme, add votes if it is
   else if ( msg.channel.id == "531170085482659851" ) {
      if ( !(msg.content.includes("http://") || msg.content.includes("https://") || msg.attachments.size > 0) ) {
         msg.delete()
            .then(msg => console.log(`Deleted message from ${msg.author.username}: "${msg.content}"`))
            .catch(console.error);
         client.channels.get('504057505266270210').send(`${msg.author}, you can only send links and attachments in <#531170085482659851>!`);
      } else {
         msg.react('⬆')
            .then(msg.react('⬇'))
            .then(console.log(`Reacted to valid meme ${msg.id} from ${msg.author.username}`))
            .catch(console.error);
         
      }
   }
});

client.on("messageReactionAdd", (reaction, user) => {
   if (reaction.message.channel.id == "531170085482659851") {
      if (reaction.emoji.toString() == '⬆') {
         console.log(user + " upvoted message " + reaction.message.id);
         let authorid = reaction.message.author.id;
         for (let i = 1; i <= file.get("usercount"); i++) {
            if (file.get(`user${i}.id`) == authorid) {
               file.set(`user${i}.points`, file.get(`user${i}.points`) + 50);
               break;
            }
         }
      }
      if (reaction.emoji.toString() == '⬇') {
         console.log(user + " upvoted message " + reaction.message.id);
         let authorid = reaction.message.author.id;
         for (let i = 1; i <= file.get("usercount"); i++) {
            if (file.get(`user${i}.id`) == authorid) {
               file.set(`user${i}.points`, file.get(`user${i}.points`) - 30);
               break;
            }
         }
      }
   }
});

// login to the bot
client.login(auth.token);
