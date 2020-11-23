const editJsonFile = require("edit-json-file");
const auth = require("./auth.json");
const trivia = require("./questions.json");
const Discord = require('discord.js');
const client = new Discord.Client();
var player1 = null; var player2 = null; var currentPlayer = null; var bet = 0;
var challengeAccepted = false; var declined = false; var gameStarted = false; var reset = false;
var question = null; var answers = []; var corrects1 = null; var corrects2 = null; var current = 0;

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

function qexpired (questionNumber) {
   if (!(questionNumber == current)) {
      client.channels.cache.get("759262285981417492").send(embed.setDescription(`${currentPlayer}, time has expired. Your answer has automatically been marked as incorrect.`));
      if (currentPlayer == player1) {
         
      }
   }
}

// Reset embed fields
function embedReset () {
   embed = new Discord.RichEmbed()
      .setAuthor("MOTMBot", "https://i.kym-cdn.com/photos/images/newsfeed/001/734/410/676.jpg")
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
   //client.channels.cache.get('504057505266270210').send("I have been reset.");
});

// // When someone new joins the server
// client.on('guildMemberAdd', gm => {
//    gm.addRole(gm.guild.roles.get("541665988186472459")); // give them the starter role
//    console.log(gm.displayName + " joined the server! Gave them the starter role.");
//    // add a new entry in users.json for the new member
//    file.set("usercount", file.get("usercount") + 1);
//    file.set(`user${file.get("usercount")}.id`, gm.id);
//    file.set(`user${file.get("usercount")}.nickname`, gm.displayName);
//    file.set(`user${file.get("usercount")}.points`, 0);
//    // send a welcome message
//    client.channels.cache.get('759262285981417492').send(`Hey ${gm.user}, welcome to **${gm.guild.name}**! Please visit <#531144896476610582> to set your roles and check out <#531141470883807252> for info about the server.`);
// });

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
            **!communism** - displays total points in server, as well as total points ÷ total members\n \
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
      }
   }
   
   // // If they send a message in voting channel, delete it if it's not a valid meme, add votes if it is
   // else if ( msg.channel.id == "531170085482659851" ) {
   //    if ( !(msg.content.includes("http://") || msg.content.includes("https://") || msg.attachments.size > 0) ) {
   //       msg.delete()
   //          .then(msg => console.log(`Deleted message from ${msg.author.username}: "${msg.content}"`))
   //          .catch(console.error);
   //       client.channels.cache.get('504057505266270210').send(`${msg.author}, you can only send links and attachments in <#759262285981417492>!`);
   //    } else {
   //       msg.react(client.emojis.get("539597117921034241"))
   //          .then((reaction) => {
   //             setTimeout(function() {}, 1000);
   //          });
	//  console.log(`Reacted to valid meme ${msg.id} from ${msg.author.username}`);
   //       msg.react(client.emojis.get("539597129489055754"));
         
   //    }
   // }
});

// // Check if a reacted message is cached and add it to cached if not (applies to old memes + rules page)
// client.on('raw', packet => {
   
//     // Ignore all events that aren't message reactions
//     if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
    
//     // Grab the channel to check the message from
//     const channel = client.channels.cache.get(packet.d.channel_id);
//     // There's no need to emit if the message is cached, because the event will fire anyway for that
//     if (channel.messages.has(packet.d.message_id)) return;
    
//     // Since we have confirmed the message is not cached, let's fetch it
//     channel.fetchMessage(packet.d.message_id).then(message => {
       
//         const emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
//         const reaction = message.reactions.get(emoji);
//         if (reaction) reaction.users.set(packet.d.user_id, client.users.get(packet.d.user_id));
        
//         // Check which type of event it is before emitting
//         if (packet.t === 'MESSAGE_REACTION_ADD') {
//             client.emit('messageReactionAdd', reaction, client.users.get(packet.d.user_id));
//         }
//         if (packet.t === 'MESSAGE_REACTION_REMOVE') {
//             client.emit('messageReactionRemove', reaction, client.users.get(packet.d.user_id));
//         }
        
//     });
// });

// If someone reacts to a meme
client.on("messageReactionAdd", (reaction, user) => {
   
   if (reaction.message.id == "541686063668658226") {
      
      reaction.message.guild.members.get(user.id).removeRole(reaction.message.guild.roles.get("541665988186472459")); // remove the starter role
      reaction.message.guild.members.get(user.id).addRole(reaction.message.guild.roles.get("531140375591649292")); // give them the Memes role
      console.log(reaction.message.guild.members.get(user.id).displayName + "reacted in #rules and received the Memes role.");
      
   } else if (reaction.message.channel.id == "531170085482659851") {

      // Give points to memer if their meme was upvoted
      if (reaction.emoji == client.emojis.get("539597117921034241")) {
         console.log(user.username + " upvoted meme " + reaction.message.id);
         let authorid = reaction.message.author.id;
         for (let i = 1; i <= file.get("usercount"); i++) {
            if (reaction.message.author == user) break;
            if (file.get(`user${i}.id`) == authorid) {
               file.set(`user${i}.points`, file.get(`user${i}.points`) + 30);
               break;
            }
         }
      }

      // Take points from memer if their meme was downvoted
      if (reaction.emoji == client.emojis.get("539597129489055754")) {
         console.log(user.username + " downvoted meme " + reaction.message.id);
         let authorid = reaction.message.author.id;
         for (let i = 1; i <= file.get("usercount"); i++) {
            if (reaction.message.author == user) break;
            if (file.get(`user${i}.id`) == authorid) {
               file.set(`user${i}.points`, file.get(`user${i}.points`) - 30);
               break;
            }
         }
      }
   }
});

// If someone removes their meme reaction
client.on("messageReactionRemove", (reaction, user) => {
   
   if (reaction.message.channel.id == "531170085482659851") {

      // If you remove an upvote, take the given points away
      if (reaction.emoji == client.emojis.get("539597117921034241")) {
         console.log(user.username + " removed upvote from meme " + reaction.message.id);
         let authorid = reaction.message.author.id;
         for (let i = 1; i <= file.get("usercount"); i++) {
            if (reaction.message.author == user) break;
            if (file.get(`user${i}.id`) == authorid) {
               file.set(`user${i}.points`, file.get(`user${i}.points`) - 30);
               break;
            }
         }
      }

      // If you remove a downvote, give the removed points back
      if (reaction.emoji == client.emojis.get("539597129489055754")) {
         console.log(user.username + " removed downvote from meme " + reaction.message.id);
         let authorid = reaction.message.author.id;
         for (let i = 1; i <= file.get("usercount"); i++) {
            if (reaction.message.author == user) break;
            if (file.get(`user${i}.id`) == authorid) {
               file.set(`user${i}.points`, file.get(`user${i}.points`) + 30);
               break;
            }
         }
      }
   }
});

// login to the bot (auth.json is in .gitignore as the token is sensitive data)
client.login(auth.token);

var embed = new Discord.RichEmbed()
   .setAuthor("MOTMBot", "https://cdn.discordapp.com/avatars/532192754550308865/97021c7d4a22128c924180655072666f.png?size=2048")
   .setColor(3447003);
