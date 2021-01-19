const editJsonFile = require("edit-json-file");
const auth = require("./auth.json");
const trivia = require("./questions.json");
const Discord = require('discord.js');
var schedule = require('node-schedule');
//const { Chess } = require('chess.js');

//var stockfish = require("stockfish");
//var engine;

const client = new Discord.Client();
var player1 = null; var player2 = null; var currentPlayer = null; var bet = 0;
var challengeAccepted = false; var declined = false; var gameStarted = false; var reset = false;
var question = null; var answers = []; var corrects1 = null; var corrects2 = null; var current = 0;

const ELEVATOR_FLOOR_CHANNEL = "757369822920179714";
const ELEVATOR_CHANNEL = "779138826160832512";
const BOT_CHANNEL = "759262285981417492";
const REMIND_CHANNEL = "759120030524112957";

// global variables
var game;
var currentPlayer;


// open JSON file for member properties
let file = editJsonFile(`${__dirname}/info.json`, {
    autosave: true
});

// listen for input in console in case I want to send a message manually
var stdin = process.openStdin(); 
stdin.addListener("data", function(d) {

   console.log("you entered: [" + 
     d.toString().trim() + "]");
     
   client.channels.get('759262285981417492').send(d.toString().trim());
   
});   

// Sleep function in case it's needed
function sleep (time) {
   return new Promise((resolve) => setTimeout(resolve, time));
}

function resetChess() {
   game.reset();
   game = null;
   currentPlayer = null;
   engine.postMessage("quit");
   engine = null;
}


// Shuffle the answer choices in a challenge
function shuffle (array) {

  let j = 0
  let temp = null;
  for (let i = array.length - 1; i > 0; i -= 1) {
    j = Math.floor(Math.random() * (i + 1))
    temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  
  return array;
}

function challengereset () {
   if (!challengeAccepted && !declined && !reset) {
      for (let i = 1; i <= file.get("usercount"); i++) {
         file.set(`user${i}.challenged`, false);
      }
      player1 = null;
      player2 = null;
      currentPlayer = null;
      gameStarted = false;
      question = null; answers = [];
      current = 0;
   }
   reset = false;
   declined = false;
}

// Reset embed fields
function embedReset () {
   embed = new Discord.RichEmbed()
      .setAuthor("MOTMBot", "https://images-ext-2.discordapp.net/external/W48UjJkcThQsD8KPJ8_4rNlkh6-9AXHM_HwYvSf5olQ/%3Fsize%3D1024/https/cdn.discordapp.com/avatars/532192754550308865/d2657e765b86629179f7a101a2d835b8.png?width=677&height=677")
      .setColor(3447003);
}

// Let console know the bot's started
client.on('ready', () => {
   console.log(`Logged in as ${client.user.tag}!`);
   console.log(`There are ${trivia.results.length} questions available for trivia.`);
   for (let i = 1; i <= file.get("usercount"); i++) {
      file.set(`user${i}.challenged`, false);
   }
   challengeAccepted = false;
   gameStarted = false;
   player1 = null; player2 = null; currentPlayer = null;
   question = null; answers = null;

   var reminder = schedule.scheduleJob('30 9 * * 1', function() {
      client.channels.get(REMIND_CHANNEL).send("@everyone Remember to fill out Monday attendance before 4:00 PM this afternoon: https://tinyurl.com/monday-check-in-2020");
   });
});

// When someone sends a message
client.on('message', msg => {
   embedReset();
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

   if (msg.author.bot) {
      return;
   }

   let mcheck = msg.content.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\|]/g, "").split(" ");
   if (mcheck.includes("m") && !["308756179109281792", "472389625705660416"].includes(msg.author.id)) {
      msg.react(msg.guild.emojis.get("800821317796102210"));
   }
   
   // If the message is a command
   if (msg.content.substring(0, file.get("prefix").length) == file.get("prefix")) {
      
      // check for arguments
      let firstspace = msg.content.indexOf(" ");
      let truefirstspace = firstspace;
      let args;
      if (firstspace == -1) firstspace = msg.content.length;
      console.log(firstspace);
      switch (msg.content.substring(file.get("prefix").length, firstspace)) {
         
         case "points" :
            // If someone wants to know someone else's points
            console.log(msg.member.id);
            if (msg.mentions.members.size > 0) {
               console.log(msg.mentions.members.first().user.id);
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
               msg.reply(embed.setDescription("You need to specify an amount to purge!"));
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
            embedReset();
            let toppeople = ["", "", "", "", "", "", "", "", "", ""];
            let topvalues = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (let i = 0; i < 10; i ++) {
               for (let g = 1; g <= file.get("usercount"); g++) { 
                  if (!toppeople.includes(file.get(`user${g}.nickname`)) && file.get(`user${g}.points`) > topvalues[i]) {
                     topvalues[i] = file.get(`user${g}.points`);
                     toppeople[i] = file.get(`user${g}.nickname`);
                  }
               }
            }
            let description = "";
            for (let i = 0; i < 10; i++) {
               description += `${i+1}. ${toppeople[i]} - ${topvalues[i]} points \n`;
            }
            msg.reply(embed.setDescription(description));
            break;
         
         // Send a random question   
         case "question" :
            let testQuestion = trivia.results[Math.floor(Math.random() * trivia.results.length)];
            if (testQuestion.type == "boolean") {
               let qType = "True/False";
               msg.reply(embed.setTitle(`**${qType}: **`).setDescription(testQuestion.question).addField("A", "True", true).addField("B", "False", true));
            } else if (testQuestion.type == "multiple") {
               let qType = "Multiple Choice";
               answers = [testQuestion.correct_answer];
               for (let wrong of testQuestion.incorrect_answers) {
                  answers.push(wrong);
               }
               msg.reply(embed.setTitle(`**${qType}: **`).setDescription(testQuestion.question).addField("A", answers[0], true).addField("B", answers[1], true).addBlankField(false).addField("C", answers[2], true).addField("D", answers[3], true));
            }
            break;
            
         // Duel a player!
         case "challenge" :
            if (player1 == msg.author.id) msg.reply(embed.setDescription("You must wait before issuing a new challenge!"));
            else if (player1 != null) msg.reply(embed.setDescription("You must wait for the current challenge to end!"));
            else if (msg.mentions.members.size == 0) msg.reply(embed.setDescription("You need to challenge someone! \n*Syntax: !challenge <user> <bet>*"));
            else if (msg.content.substring(msg.content.indexOf(">")).match(/\d+/) == null) msg.reply(embed.setDescription("You need to specify a bet for the challenge! \n*Syntax: !challenge <user> <bet>*"));
            else if (msg.mentions.members.first() == msg.member) msg.reply(embed.setDescription("You cannot challenge yourself!"));
            // else if (msg.mentions.members.first().presence.status != "online") { 
            //    msg.reply(`${msg.mentions.members.first()} is currently **${msg.mentions.members.first().presence.status}**. Please try contacting them when they're **online**!`);
            else {
               // The challenge is valid, send the invitation and set up variables
               bet = parseInt(msg.content.substring(msg.content.indexOf(">")).match(/\d+/).shift());
               let greater1 = false;
               let greater2 = false;
               for (let i = 1; i <= file.get("usercount"); i ++) {
                  if (file.get(`user${i}.id`) == msg.author.id && file.get(`user${i}.points`) < bet) {
                     greater1 = true;
                     break;
                  } else if (file.get(`user${i}.id`) == msg.mentions.members.first().user.id && file.get(`user${i}.points`)/2 < bet) {
                     greater2 = true;
                     break;
                  }
               }
               
               if (greater1) msg.reply(embed.setDescription("You cannot bet more than you have!"));
               else if (greater2) msg.reply(embed.setDescription(`You cannot bet more than half of ${msg.mentions.members.first().user}'s balance!`));
               else {
                  player1 = msg.author;
                  player2 = msg.mentions.members.first().user;
                  
                  for (let i = 1; i <= file.get("usercount"); i++) {
                     if (file.get(`user${i}.id`) == player2.id) {
                        file.set(`user${i}.challenged`, true);
                        break;
                     }
                  }
                  msg.reply(embed.setDescription(`${player2}, you have been challenged by **${msg.member.displayName}** for **${bet} points**! This challenge expires in 5 minutes - use !accept to accept.`));
                  setTimeout(challengereset, 300000); // Expire after 5 minutes
               }
            }
            break;
            
         // Accepting a challenge
         case "accept" :
            if (gameStarted) msg.reply(embed.setDescription("There's already a challenge going on."));
            else {
               for (let i = 1; i <= file.get("usercount"); i++) {
                  if (file.get(`user${i}.id`) == msg.author.id && file.get(`user${i}.challenged`) == true) {
                     challengeAccepted = true;
                     gameStarted = true;
                     msg.reply(embed.setDescription(`${msg.author}**, you've accepted the challenge!** It's ${player1}'s turn.`));
                     current = 1;
                     currentPlayer = player1;
                     question = trivia.results[Math.floor(Math.random() * trivia.results.length)];
                     if (question.type == "multiple") {
                        let qType = "Multiple Choice";
                        answers = [question.correct_answer];
                        for (let wrong of question.incorrect_answers) {
                           answers.push(wrong);
                        }
                        answers = shuffle(answers);
                        msg.channel.send(embed.setTitle(`**${qType}: **`).setDescription(question.question).addField("A", answers[0], true).addField("B", answers[1], true).addBlankField(false).addField("C", answers[2], true).addField("D", answers[3], true));
                     } else if (question.type == "boolean") {
                        let qType = "True/False";
                        answers = ["True", "False"];
                        msg.channel.send(embed.setTitle(`**${qType}**`).setDescription(question.question).addField("A", answers[0], true).addField("B", answers[1], true));
                     }
                     
                  }
               }
               if (!challengeAccepted) msg.reply(embed.setDescription(`${msg.author}, you haven't been challenged!`));
            }
            break;
         
         // Declining a challenge (reset variables)
         case "decline" :
            for (let i = 1; i <= file.get("usercount"); i++) {
               if (file.get(`user${i}.id`) == msg.author.id) {
                  if (challengeAccepted == true) {
                     msg.reply(embed.setDescription("You can't decline the challenge once it's started!"));
                  } else if (file.get(`user${i}.challenged`) == true) {
                     challengeAccepted = false;
                     file.set(`user${i}.challenged`, false);
                     player1 = null;
                     player2 = null;
                     bet = 0;
                     currentPlayer = null;
                     declined = true;
                     gameStarted = false;
                     question = null; answers = null;
                     current = 0;
                     msg.reply(embed.setDescription(`${msg.author}**, you've declined the challenge!**`));
                  } else {
                     msg.reply(embed.setDescription(`${msg.author}**, you haven't been challenged!**`));
                  }
               }
            }
            break;
            
         // Reset all challenges if something bugs out
         case "reset" :
            for (let i = 1; i <= file.get("usercount"); i++) {
               file.set(`user${i}.challenged`, false);
            }
            reset = true;
            challengeAccepted = false;
            gameStarted = false;
            player1 = null; player2 = null; currentPlayer = null;
            question = null; answers = null;
            corrects1 = null; corrects2 = null;
            current = 0;
            bet = 0;
            msg.reply(embed.setDescription("All challenges have been reset!"));
            break;
         
         case "answer" :
            if (!gameStarted) msg.reply(embed.setDescription("A game has not yet been started."));
            else if (msg.author.id != player1.id && msg.author.id != player2.id) msg.reply(embed.setDescription("You are not in this challenge!"));
            else if (msg.author.id != currentPlayer.id) msg.reply(embed.setDescription("This is not your turn."));
            else if (truefirstspace == -1) {
               msg.reply(embed.setDescription("You need to pick an answer!"))
                  .catch(console.error);
            } else {
               let invalid = false;
               switch (msg.content.substring(firstspace).trim()) {
                  case "a" : // Fallthrough
                  case "A" :
                     if (question.correct_answer == answers[0]) {
                        if (currentPlayer == player1) { corrects1 = true; corrects2 = null; current = 0; }
                        else { corrects2 = true; }
                        msg.reply(embed.setDescription("**Correct!**"));
                     } else {
                        if (currentPlayer == player1) { corrects1 = false; corrects2 = null; current = 0; }
                        else { corrects2 = false; }
                        msg.reply(embed.setDescription(`**Incorrect!**  The correct answer was ${question.correct_answer}.`));
                     }
                     break;
                  case "b" : // Fallthrough
                  case "B" :
                     if (question.correct_answer == answers[1]) {
                        if (currentPlayer == player1) { corrects1 = true; corrects2 = null; current = 0; }
                        else { corrects2 = true; }
                        msg.reply(embed.setDescription("**Correct!**"));
                     } else {
                        if (currentPlayer == player1) { corrects1 = false; corrects2 = null; current = 0; }
                        else { corrects2 = false; }
                        msg.reply(embed.setDescription(`**Incorrect!** The correct answer was ${question.correct_answer}.`));
                     }
                     break;
                  case "c" : // Fallthrough
                  case "C" :
                     if (question.type == "boolean") {
                        msg.reply(embed.setDescription("There is no answer C!"));
                     } else if (question.correct_answer == answers[2]) {
                        if (currentPlayer == player1) { corrects1 = true; corrects2 = null; current = 0; }
                        else { corrects2 = true; }
                        msg.reply(embed.setDescription("**Correct!**"));
                     } else {
                        if (currentPlayer == player1) { corrects1 = false; corrects2 = null; current = 0; }
                        else { corrects2 = false; }
                        msg.reply(embed.setDescription(`**Incorrect!** The correct answer was ${question.correct_answer}.`));
                     }
                     break;
                  case "d" : // Fallthrough
                  case "D" :
                     if (question.type == "boolean") {
                        msg.reply(embed.setDescription("There is no answer D!"));
                     } else if (question.correct_answer == answers[3]) {
                        if (currentPlayer == player1) { corrects1 = true; corrects2 = null; current = 0; }
                        else { corrects2 = true; }
                        msg.reply(embed.setDescription("**Correct!**"));
                     } else {
                        if (currentPlayer == player1) { corrects1 = false; corrects2 = null; current = 0; }
                        else { corrects2 = false; }
                        msg.reply(embed.setDescription(`**Incorrect!** The correct answer was ${question.correct_answer}.`));
                     }
                     break;
                  default :
                     msg.reply(embed.setDescription("That's not a valid answer."));
                     invalid = true;
                     break;
               }
               
               console.log(corrects1); console.log(corrects2);
               if (!invalid) {
                  current ++;
                  if (corrects1 == false && corrects2 == true) {
                     msg.channel.send(embed.setDescription(`**${player2} wins!** Congratulations - **${bet}** points have been added to your account.`));
                     for (let i = 1; i <= file.get("usercount"); i++) {
                        if (file.get(`user${i}.id`) == player2.id) file.set(`user${i}.points`, file.get(`user${i}.points`) + bet);
                        else if (file.get(`user${i}.id`) == player1.id) file.set(`user${i}.points`, file.get(`user${i}.points`) - bet);
                        file.set(`user${i}.challenged`, false);
                     }
                     reset = false;
                     challengeAccepted = false;
                     gameStarted = false; bet = 0;
                     player1 = null; player2 = null; currentPlayer = null;
                     question = null; answers = []; corrects1 = null; corrects2 = null; current = 0;
                  } else if (corrects1 == true && corrects2 == false) {
                     msg.channel.send(embed.setDescription(`**${player1} wins!** Congratulations - **${bet}** points have been added to your account.`));
                     for (let i = 1; i <= file.get("usercount"); i++) {
                        if (file.get(`user${i}.id`) == player1.id) file.set(`user${i}.points`, file.get(`user${i}.points`) + bet);
                        else if (file.get(`user${i}.id`) == player2.id) file.set(`user${i}.points`, file.get(`user${i}.points`) - bet);
                        file.set(`user${i}.challenged`, false);
                     }
                     reset = false;
                     challengeAccepted = false;
                     gameStarted = false; bet = 0;
                     player1 = null; player2 = null; currentPlayer = null;
                     question = null; answers = []; corrects1 = null; corrects2 = null; current = 0;
                  } else if (corrects1 == true && corrects2 == true) {
                     msg.channel.send(embed.setDescription(`Both players were correct! It's ${player1}'s turn!`));
                     currentPlayer = player1;
                     question = trivia.results[Math.floor(Math.random() * trivia.results.length)];
                     if (question.type == "multiple") {
                        let qType = "Multiple Choice";
                        answers = [question.correct_answer];
                        for (let wrong of question.incorrect_answers) {
                           answers.push(wrong);
                        }
                        answers = shuffle(answers);
                        msg.channel.send(embed.setTitle(`**${qType}: **`).setDescription(question.question).addField("A", answers[0], true).addField("B", answers[1], true).addBlankField(false).addField("C", answers[2], true).addField("D", answers[3], true));
                     } else if (question.type == "boolean") {
                        let qType = "True/False";
                        answers = ["True", "False"];
                        msg.channel.send(embed.setTitle(`**${qType}**`).setDescription(question.question).addField("A", answers[0], true).addField("B", answers[1], true));
                     }
                  } else if (corrects1 == false && corrects2 == false) {
                     let letter = "";
                     currentPlayer = player1;
                     msg.channel.send(embed.setDescription(`Both players were incorrect! \nIt's ${player1}'s turn!`));
                     question = trivia.results[Math.floor(Math.random() * trivia.results.length)];
                     if (question.type == "multiple") {
                        let qType = "Multiple Choice";
                        answers = [question.correct_answer];
                        for (let wrong of question.incorrect_answers) {
                           answers.push(wrong);
                        }
                        answers = shuffle(answers);
                        msg.channel.send(embed.setTitle(`**${qType}: **`).setDescription(question.question).addField("A", answers[0], true).addField("B", answers[1], true).addBlankField(false).addField("C", answers[2], true).addField("D", answers[3], true));
                     } else if (question.type == "boolean") {
                        let qType = "True/False";
                        answers = ["True", "False"];
                        msg.channel.send(embed.setTitle(`**${qType}**`).setDescription(question.question).addField("A", answers[0], true).addField("B", answers[1], true));
                     }
                  } else if ( (corrects1 == true || corrects1 == false) && corrects2 == null) {
                     msg.channel.send(embed.setDescription(`It's ${player2}'s turn!`));
                     currentPlayer = player2;
                     question = trivia.results[Math.floor(Math.random() * trivia.results.length)];
                     if (question.type == "multiple") {
                        let qType = "Multiple Choice";
                        answers = [question.correct_answer];
                        for (let wrong of question.incorrect_answers) {
                           answers.push(wrong);
                        }
                        answers = shuffle(answers);
                        msg.channel.send(embed.setTitle(`**${qType}: **`).setDescription(question.question).addField("A", answers[0], true).addField("B", answers[1], true).addBlankField(false).addField("C", answers[2], true).addField("D", answers[3], true));
                     } else if (question.type == "boolean") {
                        let qType = "True/False";
                        answers = ["True", "False"];
                        msg.channel.send(embed.setTitle(`**${qType}**`).setDescription(question.question).addField("A", answers[0], true).addField("B", answers[1], true));
                     }
                  }
               }
            }
            break;

         case "communism" :
            let total = 0.0;
            for (let i = 1; i <= file.get("usercount"); i++) {
               total += parseFloat(file.get(`user${i}.points`));
            }
            msg.reply(embed.setDescription(`The Союз Советских Социалистических Республик (USSR) has a capital of **${total} rubles**. \nIn our Советский Союз (Soviet Union), each man is pensioned his **${(total/file.get("usercount")).toFixed(2)} rubles**. \n**Приветствую Родину!**`));
            break;
         
         case "update" :
            if (msg.mentions.members.size > 0) {
               for (let i = 1; i <= file.get("usercount"); i++) {
                  if (file.get(`user${i}.id`) == msg.mentions.members.first().id) {
                     file.set(`user${i}.nickname`, msg.mentions.members.first().displayName);
                     break;
                  }
               }
               msg.reply(embed.setDescription(`Updated **${msg.mentions.members.first().displayName}**'s information!`));
            } else {
               for (let i = 1; i <= file.get("usercount"); i++) {
                  if (file.get(`user${i}.id`) == msg.author.id) {
                     file.set(`user${i}.nickname`, msg.member.displayName);
                     break;
                  }
               }
               msg.reply(embed.setDescription("Updated your information!"));
            }
            
            break;
         case "give" :
            let amount = parseInt(msg.content.substring(msg.content.indexOf(">")).match(/\d+/).shift());
            let failed = false;
            if (msg.mentions.members.size < 1) msg.reply(embed.setDescription("You need to specify a user to give points to! \n*Syntax: !give <user> <amount>*"));
            else if (msg.content.substring(msg.content.indexOf(">")).match(/\d+/) == null) msg.reply(embed.setDescription("You need to specify an amount to give! \n*Syntax: !give <user> <amount>*"));
            else if (msg.author.id == msg.mentions.members.first().user.id) msg.reply(embed.setDescription("Nice try :^)"));
            else {
               for (let i = 1; i <= file.get("usercount"); i++) {
                  if (file.get(`user${i}.id`) == msg.author.id) {
                     if (amount > file.get(`user${i}.points`)) {
                        msg.reply(embed.setDescription("Not enough points to give!"))
                        failed = true;
                        break;
                     }
                     file.set(`user${i}.points`, file.get(`user${i}.points`) - amount);
                  }
               }

               if (failed) {
                  break;
               }

               for (let i = 1; i <= file.get("usercount"); i++) {
                  if (file.get(`user${i}.id`) == msg.mentions.members.first().user.id) {
                     file.set(`user${i}.points`, file.get(`user${i}.points`) + amount);
                  }
               }
               msg.reply(embed.setDescription(`You gave ${msg.mentions.members.first().user} ${amount} points!`));
            }
            break;
         
         case "current" :
            break;
            
         case "help" :
            msg.reply(embed.setTitle("**Commands**").setDescription("**!points** - displays your point balance\n \
            **!points <@user>** - displays user's point balance\n \
            **!top** - displays top 10 leaderboard\n \
            **!give <@user> <amount>** - gives user amount of points from your balance\n \
            **!challenge <@user> <amount>** - challenges user to a trivia duel, bet is amount\n \
            **!communism** - displays total points in server, as well as total points  total members\n \
            **!update** - updates your nickname on the leaderboard"));
            break;
            
         case "chicken" :
            let userid = "";
            for (let i = 1; i <= file.get("usercount"); i++) {
               if (file.get(`user${i}.id`) == msg.author.id) {
                  userid = `user${i}`;
               }
            }
            if (file.get(`${userid}.chicken`) == -1) msg.reply(embed.setDescription("You do not have a chicken! Buy one from the shop."));
            else if (msg.content.substring(msg.content.indexOf(">")).match(/\d+/) == null) msg.reply(embed.setDescription("You need to specify a bet for your chicken fight!"));
            else if (parseInt(msg.content.substring(msg.content.indexOf(">")).match(/\d+/)) > file.get(`${userid}.points`)) msg.reply(embed.setDescription("You do not have enough points to make this bet!"));
            else if (parseInt(msg.content.substring(msg.content.indexOf(">")).match(/\d+/)) < 50) msg.reply(embed.setDescription("Your bet must be at least 50 points."));
            else {
               let bet = parseInt(msg.content.substring(msg.content.indexOf(">")).match(/\d+/));
               let chance = (Math.random()  * 100) < file.get(`${userid}.chicken`);
               msg.channel.send(embed.setDescription("3")).then((msg) => {
                  setTimeout(function(msg){
                     
                     msg.edit(embed.setDescription("2"));
                     
                     setTimeout(function(msg){
                        
                        msg.edit(embed.setDescription("1"));
                        
                        setTimeout(function(msg){
                           if (chance) {
                              file.set(`${userid}.chicken`, file.get(`${userid}.chicken`) + 1);
                              file.set(`${userid}.points`, file.get(`${userid}.points`) + bet);
                              if (file.get(`${userid}.chicken`) == 70) msg.edit(embed.setTitle("Your chicken won!").setDescription(`You gained **${bet} points**! Your chicken has been maxed out. Purchase a new chicken to continue!`));
                              else msg.edit(embed.setTitle("Your chicken won!").setDescription(`You gained **${bet} points** and your chicken grew stronger. It now has a **${file.get(`${userid}.chicken`)}% chance** of winning future fights.`));
                           } else {
                              file.set(`${userid}.chicken`, -1);
                              file.set(`${userid}.points`, file.get(`${userid}.points`) - bet);
                              msg.edit(embed.setTitle("Your chicken lost").setDescription(`You lost **${bet} points** and your chicken died.`));
                           }
                        }, 1000, msg);
                        
                     }, 1000, msg);
                     
                  }, 1000, msg);
               
               })
            }
            break;
            
         case "buy" :
            let authorid = "";
            for (let i = 1; i <= file.get("usercount"); i++) {
               if (file.get(`user${i}.id`) == msg.author.id) {
                  authorid = `user${i}`;
               }
            }
            switch (msg.content.substring(firstspace).trim()) {
               case "chicken" : // fallthrough
               case "Chicken" : 
                  const COST = 50;
                  if (file.get(`${authorid}.points`) < COST) msg.reply(embed.setDescription("You do not have enough points to purchase a chicken!"));
                  else if (file.get(`${authorid}.chicken`) != -1) msg.reply(embed.setDescription("You already own a chicken!"));
                  else {
                     file.set(`${authorid}.points`, file.get(`${authorid}.points`) - 50);
                     file.set(`${authorid}.chicken`, 50);
                     msg.reply(embed.setDescription("You bought **1 chicken** for 50 points!"));
                  }
                  break;
            }
            break;
            
         case "shop" :
            msg.reply(embed.setTitle("Shop").setDescription("**Chicken** - 50"));
            break;

         case "elevator" :

            let main = msg;

            if (main.member.voiceChannelID == ELEVATOR_FLOOR_CHANNEL) {
               main.reply(embed.setDescription("The elevator doors have shut. Please wait patiently: 5")).then((msg) => {
                  setTimeout(function (msg) {

                     msg.edit(embed.setDescription("The elevator doors have shut. Please wait patiently: 4"));

                     setTimeout(function (msg) {

                        msg.edit(embed.setDescription("The elevator doors have shut. Please wait patiently: 3"));

                        setTimeout(function (msg) {

                           msg.edit(embed.setDescription("The elevator doors have shut. Please wait patiently: 2"));

                           setTimeout(function (msg) {

                              msg.edit(embed.setDescription("The elevator doors have shut. Please wait patiently: 1"));

                              setTimeout(function (msg) {

                                 console.log(main.member.voiceChannelID);

                                main.member.setVoiceChannel(ELEVATOR_CHANNEL)
                                    .then(() => console.log(`Moved ${main.member.displayName}`))
                                    .catch(console.error);

                                 msg.edit(embed.setDescription("You have arrived at the top floor! Enjoy your stay."));

                              }, 1000, msg)

                           }, 1000, msg)

                        }, 1000, msg)

                     }, 1000, msg);

                  }, 1000, msg);

               })
            } else {
               msg.reply(embed.setDescription("You're not on the ground floor!"));
            }
            break;
        /* case "chess" :

            args = msg.content.substring(7).split(" ");

            console.log(args);

            if (args.length < 2) {

               msg.reply(
                  embed.setTitle("Missing Arguments")
                     .addField("Syntax", "!chess [difficulty] [color]")
                     .addField("Difficulty", "Value between 0 (Easiest) and 20 (Hardest)")
                     .addField("Color", "White | Black | Random")
               );
               return;

            } else if (isNaN(parseInt(args[0])) || parseInt(args[0]) > 20 || parseInt(args[0]) < 0 || !['white', 'black', 'random'].includes(args[1].toString().toLowerCase())) {

               msg.reply(
                  embed.setTitle("Invalid Arguments")
                     .addField("Syntax", "!chess [difficulty] [color]")
                     .addField("Difficulty", "Value between 0 (Easiest) and 20 (Hardest)")
                     .addField("Color", "White | Black | Random")
               );
               return;

            }

            game = new Chess();
            currentPlayer = msg.author;

            engine = stockfish();

            engine.onmessage = function onmessage(event) {

               console.log(event);
               console.log(typeof event)

               if (typeof event == 'string' && event.toString().indexOf("bestmove") > -1) {
                  let line = event.split(" ");
                  let bestmove = line[line.indexOf("bestmove") + 1];
                  game.move(bestmove, { sloppy: true });

                  let algebraic = game.history()[game.history().length - 1].toString();
                  let fen = game.fen();
                  let lastmove = game.history({ verbose: true })[game.history().length - 1].from + game.history({ verbose: true })[game.history().length - 1].to;

                  let pnglink = `https://backscattering.de/web-boardimage/board.png?fen=${encodeURIComponent(fen)}&lastMove=${encodeURIComponent(lastmove)}`;


                  console.log(algebraic);

                  if (game.in_draw()) {

                     let drawMethod;
                     if (game.in_stalemate()) drawMethod = "stalemate";
                     else if (game.in_threefold_repetition()) drawMethod = "threefold repetition";
                     if (game.insufficient_material()) drawMethod = "insufficient material";

                     resetGame();
                     client.channels.get(BOT_CHANNEL).send(algebraic + `. **Draw** by ${drawMethod}.`, { reply: currentPlayer, embed: embed.setDescription(algebraic + `. **Draw** by ${drawMethod}.`).setImage(pnglink) });

                  } else if (game.in_checkmate()) {

                     resetGame();
                     client.channels.get(BOT_CHANNEL).send(algebraic + ". **Checkmate!**", { reply: currentPlayer, embed: embed.setDescription(algebraic + ". **Checkmate!**").setImage(pnglink) });

                  } else if (game.in_check()) {

                     let files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                     let ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

                     let checksquare;

                     for (let file = 0; file++; file < 8) {
                        for (let rank = 0; rank++; rank < 8) {
                           if (game.get(files[file] + ranks[rank]).type == 'k' && game.get(files[file] + ranks[rank]).color == game.turn()) {
                              checksquare = files[file] + ranks[rank];
                              break;
                           }
                        }
                     }

                     pnglink += `&check=${encodeURIComponent(checksquare)}`;

                     client.channels.get(BOT_CHANNEL).send(algebraic + ". Check!", { reply: currentPlayer, embed: embed.setDescription(algebraic + ". Check!").setImage(pnglink) });

                  } else {

                     client.channels.get(BOT_CHANNEL).send(algebraic, { reply: currentPlayer, embed: embed.setDescription(algebraic).setImage(pnglink) });

                  }

               }
            }

            engine.postMessage("isready");
            engine.postMessage("setoption name threads value 3");
            engine.postMessage("setoption name hash value 1024");
            engine.postMessage("setoption name ponder value false");
            engine.postMessage(`setoption name skill level value ${args[0]}`);
            engine.postMessage("position startpos");

            let color = args[1].toLowerCase();

            if (color == 'random') {
               color = ['white', 'black'][Math.floor(Math.random() * 2)];
            }

            if (color == "white") {

               game.header('White', currentPlayer.username, 'Black', 'RL Chess Bot (StockFish 11)');

            } else if (color == "black") {

               game.header('White', 'RL Chess Bot (StockFish 11)', 'Black', currentPlayer.username);
               engine.postMessage("go depth 13");
            }

            msg.reply("New game started!");
            break;
         
         case "move" :

            args = msg.content.substring(6).split(" ");
            if (msg.author != currentPlayer) {
               msg.reply(embed.setDescription("Either you aren't in a game, or it's not your turn to move."));
               break;
            }

            if (args.length < 1) {
               msg.reply("You need to choose a move!");
               return;
            }

            let move = args[0];
            if (!game.moves().includes(move)) {
               msg.reply("That move is either invalid or illegal.");
               return;
            }

            game.move(move, { sloppy: true });

            if (game.in_draw()) {

               let drawMethod;
               if (game.in_stalemate()) drawMethod = "stalemate";
               else if (game.in_threefold_repetition()) drawMethod = "threefold repetition";
               if (game.insufficient_material()) drawMethod = "insufficient material";

               resetGame();
               client.channels.cache.get(TESTING).send(`**Draw** by ${drawMethod}.`, { reply: currentPlayer });

            } else if (game.in_checkmate()) {

               resetGame();
               client.channels.cache.get(TESTING).send("**Checkmate!** You win. ", { reply: currentPlayer });

            } else {

               engine.postMessage(`position fen ${game.fen()}`);
               engine.postMessage("go depth 13");

            }
	*/
      }
   }
   
});

client.on("messageUpdate", (oldMessage, newMessage) => {
   let mcheck = newMessage.content.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\|]/g, "").split(" ");
   if (mcheck.includes("m") && !["308756179109281792", "472389625705660416"].includes(newMessage.author.id)) {
      newMessage.react(newMessage.guild.emojis.get("800821317796102210"));
   }
});

// login to the bot (auth.json is in .gitignore as the token is sensitive data)
client.login(auth.token);

var embed = new Discord.RichEmbed()
   .setAuthor("MOTMBot", "https://images-ext-2.discordapp.net/external/W48UjJkcThQsD8KPJ8_4rNlkh6-9AXHM_HwYvSf5olQ/%3Fsize%3D1024/https/cdn.discordapp.com/avatars/532192754550308865/d2657e765b86629179f7a101a2d835b8.png?width=677&height=677")
   .setColor(3447003);

