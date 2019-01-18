const editJsonFile = require("edit-json-file");
const auth = require("./auth.json");
const trivia = require("./questions.json");
const Discord = require('discord.js');
const client = new Discord.Client();
var player1 = null; var player2 = null;
var challengeAccepted = false;

// open JSON file for member properties
let file = editJsonFile(`${__dirname}/info.json`, {
    autosave: true
});

// listen for input in console in case I want to send a message manually
var stdin = process.openStdin(); 
stdin.addListener("data", function(d) {

   console.log("you entered: [" + 
     d.toString().trim() + "]");
     
   client.channels.get('504057505266270210').send(d.toString().trim());
   
});   

// Sleep function in case it's needed
function sleep (time) {
   return new Promise((resolve) => setTimeout(resolve, time));
}

function challengereset () {
   if (!challengeAccepted) {
      for (let i = 1; i <= file.get("usercount"); i++) {
         file.set(`user${i}.challenged`, false);
      }
      client.channels.get('504057505266270210').send(embed.setDescription(`${player1.user}, your challenge to ${player2.user} has expired. You may now re-challenge them or challenge someone else.`));
      player1 = null;
      player2 = null;
   }
}

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
   console.log(`Message sent by ${msg.author.username} in ${msg.channel.name} which has id ${msg.id} and content ${msg.content}.`); // Let console know someone's sent a message
   // Give them a point for chatting
   if (msg.author.id != client.user.id) {
      for (let i = 1; i <= file.get("usercount"); i++) {
         if (file.get(`user${i}.id`) == msg.author.id) {
            file.set(`user${i}.points`, file.get(`user${i}.points`) + 1);
            break;
         }
      }
   }
   
   // If the message is a command
   if (msg.content.substring(0, file.get("prefix").length) == file.get("prefix")) {
      
      // check for arguments
      let firstspace = msg.content.indexOf(" ");
      let truefirstspace = firstspace;
      if (firstspace == -1) firstspace = msg.content.length;
      console.log(firstspace);
      switch (msg.content.substring(file.get("prefix").length, firstspace)) {
         
         case "points" :
            // If someone wants to know someone else's points
            if (msg.mentions.members.size > 0) {
               for (let i = 1; i <= file.get("usercount"); i++) {
                  if (file.get(`user${i}.id`) == msg.mentions.members.first().id) {
                     msg.reply(`${msg.mentions.members.first().user.username} has ${file.get(`user${i}.points`)} points!`);
                     break;
                  }
               }
            
            // Their own points
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
         
         // Changing the prefix
         case "prefix" :
            if ( !msg.member.highestRole.name.toLowerCase().includes("memer") ) {
               msg.reply(embed.setDescription("You are not an admin!"))
                  .catch(console.error);
            }
            else if (truefirstspace == -1) {
               msg.reply(embed.setDescription("You need to specify a new prefix!"))
                  .catch(console.error);
            }
            else {
               file.set("prefix", msg.content.substring(firstspace).trim());
               msg.reply(embed.setDescription(`the new prefix is **${file.get("prefix")}**`))
                  .then(msg => console.log(`Prefix changed to ${file.get("prefix")}`))
                  .catch(console.error);
            }
            break;
           
         // Deleting multiple messages in a channel
         case "purge" :
            if ( !msg.member.highestRole.name.toLowerCase().includes("memer") ) msg.reply("You are not an admin!");
            else if (msg.content.match(/\d+/) == null) {
               msg.reply({embed: {
                  author: {
                     name: client.user.username,
                     icon_url: client.user.avatarURL
                  },
                  color: 3447003,
                  description: "You need to specify an amount to purge!"
               }}).then(message => { message.delete(5000) });
            } else {
               let amount = parseInt(msg.content.match(/\d+/).shift());
               msg.channel.bulkDelete(amount + 1)
                  .then(msg => console.log(`Bulk deleted ${amount} messages`))
                  .catch(console.error)
                  
               msg.reply(embed.setDescription(`Purged **${amount}** messages!`))
                  .then(message => { message.delete(5000) })
                  .catch(console.error);
               
            }
            break;

         case "top" : // Fallthrough
         case "leaderboard" :
            let toppeople = ["", "", "", "", "", "", "", "", "", ""];
            let topvalues = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (let current = 0; current < 10; current ++) {
               for (let i = 1; i <= file.get("usercount"); i++) { 
                  if (!toppeople.includes(file.get(`user${i}.nickname`)) && file.get(`user${i}.points`) > topvalues[current]) {
                     topvalues[current] = file.get(`user${i}.points`);
                     toppeople[current] = file.get(`user${i}.nickname`);
                  }
               }
            }
            let description = "";
            for (let i = 0; i < 10; i++) {
               description += `${i+1}. ${toppeople[i]} - ${topvalues[i]} points \n`;
            }
            msg.reply(embed.setDescription(description));
            break;
            
         case "question" :
            msg.reply(embed.setDescription(trivia.results[Math.floor(Math.random() * trivia.results.length)].question));
            break;
            
         case "challenge" :
            if (player1 == msg.author.id) msg.reply(embed.setDescription("You must wait before issuing a new challenge!"));
            else if (player1 != null) msg.reply(embed.setDescription("You must wait for the current challenge to end!"));
            else if (msg.mentions.members.size == 0) msg.reply(embed.setDescription("You need to challenge someone!"));
            else if (msg.mentions.members.first().presence.status != "online") { 
               msg.reply(`${msg.mentions.members.first()} is currently **${msg.mentions.members.first().presence.status}**. Please try contacting them when they're **online**!`);
            } else {
               player1 = msg.member;
               player2 = msg.mentions.members.first();
               for (let i = 1; i <= file.get("usercount"); i++) {
                  if (file.get(`user${i}.id`) == player2.id) {
                     file.set(`user${i}.challenged`, true);
                     break;
                  }
               }
               msg.reply(embed.setDescription(`${player2}, you have been challenged by **${msg.member.displayName}**! This challenge expires in 5 minutes - use !accept to accept.`));
               setTimeout(challengereset, 10000);
            }
            break;
            
         case "accept" :
            for (let i = 1; i <= file.get("usercount"); i++) {
               if (file.get(`user${i}.id`) == msg.author.id && file.get(`user${i}.challenged`) == true) {
                  challengeAccepted = true;
                  msg.reply(embed.setDescription(`${msg.author}**, you've accepted the challenge!**`));
               }
            }
            if (!challengeAccepted) msg.reply(embed.setDescription(`${msg.author}, you haven't been challenged!`));
            break;
            
         case "reset" :
            for (let i = 1; i <= file.get("usercount"); i++) {
               file.set(`user${i}.challenged`, false);
            }
            challengeAccepted = false;
            msg.reply(embed.setDescription("All challenges have been reset!"));
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
            .then(sleep(1500))
            .then(msg.react('⬇'))
            .then(console.log(`Reacted to valid meme ${msg.id} from ${msg.author.username}`))
            .catch(console.error);
         
      }
   }
});

// If someone reacts to a meme
client.on("messageReactionAdd", (reaction, user) => {

   if (reaction.message.channel.id == "531170085482659851") {

      // Give points to memer if their meme was upvoted
      if (reaction.emoji.toString() == '⬆') {
         console.log(user + " upvoted message " + reaction.message.id);
         let authorid = reaction.message.author.id;
         for (let i = 1; i <= file.get("usercount"); i++) {
            if (reaction.message.author == user) break;
            if (file.get(`user${i}.id`) == authorid) {
               file.set(`user${i}.points`, file.get(`user${i}.points`) + 50);
               break;
            }
         }
      }

      // Take points from memer if their meme was downvoted
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

// login to the bot (auth.json is in .gitignore as the token is sensitive data)
client.login(auth.token);

var embed = new Discord.RichEmbed()
   .setAuthor("MOTMBot", "https://cdn.discordapp.com/avatars/532192754550308865/c3c574b654c949b0ab99d92ae4287381.png?size=2048")
   .setColor(3447003);
