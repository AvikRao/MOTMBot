const fs = require("fs");
const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require("./auth.json");
const globals = require("./globals.json");
const got = require("got");
const htmlDecode = require('html-entities');
const util = require("util");
var schedule = require('node-schedule');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

var embed = new Discord.MessageEmbed();
const triviaAPI = "https://opentdb.com/api.php?amount=1&difficulty=hard&type=multiple";
const shop = {
   "chicken": 50,
};

client.on('ready', async () => {
   console.log(`Logged in as ${client.user.tag}!`);
   client.user.setActivity("♻️ Refactoring ♻️");

   var reminder = schedule.scheduleJob('30 9 * * 1', async function () {
      const guildBoisGeneral = await client.channels.fetch(globals.GUILD_BOIS_GENERAL_ID);
      guildBoisGeneral.send("@everyone Remember to fill out Monday attendance before 4:00 PM this afternoon: https://tinyurl.com/monday-check-in-2020");
   });

});

client.on("guildCreate", async (guild) => {
   let guildList = JSON.parse((await readFile("data.json")));
   guildList.guilds[guild.id] = { prefix: "!", members: {} };
   let members = await guild.members.fetch();
   members.forEach((user) => {
      guildList.guilds[guild.id].members[user.id] = {
         points: 0,
         chicken: 0
      };
   });

   await writeFile("data.json", JSON.stringify(guildList));
});

client.on("guildMemberAdd", async (member) => {
   let data = JSON.parse((await readFile("data.json")));
   data.guilds[member.guild.id].members[member.id] = {
      points: 0,
      chicken: 0
   };
   await writeFile("data.json", JSON.stringify(data));
});

client.on("message", async (message) => {

   resetEmbed();

   let mcheck = message.content.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?ᅠ᲼᲼᲼\|]/g, "").split(" ");
   if (mcheck.includes("m") && !["308756179109281792", "472389625705660416", "188303679235948544"].includes(message.author.id)) {
      try {
         await message.react(message.guild.emojis.resolve("800821317796102210"));
      } catch (e) {
         message.delete();
      }
   }

   if (message.author.bot)
      return;

   let data = JSON.parse((await readFile("data.json")));
   let messageGuild = message.guild;
   let messageChannel = message.channel;
   data.guilds[messageGuild.id].members[message.author.id].points += 1;
   await writeFile("data.json", JSON.stringify(data));

   data = JSON.parse((await readFile("data.json")));
   if (message.content.startsWith(data.guilds[messageGuild.id].prefix)) {
      let commandBody = message.content.slice(data.guilds[messageGuild.id].prefix.length).toLocaleLowerCase().split(" ");
      let command = commandBody[0].toLocaleLowerCase();

      switch (command) {
         case "points": {
            let mentioned = message.mentions.members.first();
            if (!mentioned) {
               message.reply(embed.setDescription(`You have ${data.guilds[messageGuild.id].members[message.author.id].points} points.`));
            } else {
               message.reply(embed.setDescription(`${mentioned} has ${data.guilds[messageGuild.id].members[mentioned.id].points} points.`));
               // message.reply(messageGuild.members.resolve(lookupMember));
            }
            break;
         }

         case "prefix": {
            if (!message.member.hasPermission("ADMINISTRATOR")) {
               message.reply(embed.setDescription("You are not an administrator!"));
            } else if (commandBody.length < 2) {
               message.reply(embed.setDescription(`The current prefix is \`${data.guilds[messageGuild.id].prefix}\``));
            } else {
               data.guilds[messageGuild.id].prefix = commandBody[1];
               await writeFile("data.json", JSON.stringify(data));
               message.reply(embed.setDescription(`Prefix changed to \`${data.guilds[messageGuild.id].prefix}\``));
            }
            break;
         }

         case "top": // Fallthrough
         case "leaderboard": {
            let dataMemberList = Object.keys(data.guilds[messageGuild.id].members);
            let leaderboard = dataMemberList.sort((a, b) => {
               return data.guilds[messageGuild.id].members[b].points - data.guilds[messageGuild.id].members[a].points;
            });
            const memberPosition = leaderboard.indexOf(message.author.id)
            let embedDescription = "";
            for (let i = 0; i < 10; i++) {
               if (i == memberPosition) {
                  embedDescription += `**${i + 1}. ${messageGuild.member(leaderboard[i]).user.tag} - ${data.guilds[messageGuild.id].members[leaderboard[i]].points} points** \n`;
               } else {
                  try {
                     embedDescription += `${i + 1}. ${messageGuild.member(leaderboard[i]).user.tag} - ${data.guilds[messageGuild.id].members[leaderboard[i]].points} points \n`;
                  } catch (e) {
                     break;
                  }
               }
            }

            if (memberPosition >= 10) {
               embedDescription += `**${memberPosition}. ${messageGuild.member(leaderboard[memberPosition]).user.tag} - ${data.guilds[messageGuild.id].members[leaderboard[memberPosition]].points} points** \n`;
            }

            message.reply(embed.setDescription(embedDescription));
            break;
         }

         case "elevator": {
            if (messageGuild.id != globals.GUILD_BOIS_ID) {
               message.reply(embed.setDescription("You've discovered a hidden command! Too bad you're not in the right server..."));
            } else if (message.member.voice.channelID != globals.ELEVATOR_GROUND_FLOOR_ID) {
               message.reply(embed.setDescription("You're not on the ground floor!"));
            } else {
               const response = await message.reply(embed.setDescription("The elevator doors have shut. Please wait patiently: 3"));
               setTimeout(async function () {
                  await response.edit(embed.setDescription("The elevator doors have shut. Please wait patiently: 2"));
                  setTimeout(async function () {
                     await response.edit(embed.setDescription("The elevator doors have shut. Please wait patiently: 1"));
                     setTimeout(async function () {
                        if (message.member.voice.channelID != globals.ELEVATOR_GROUND_FLOOR_ID) {
                           await response.edit(embed.setDescription("Oh? You've suddenly fallen off the elevator on the way up..."));
                        } else {
                           message.member.voice.setChannel(globals.ELEVATOR_ID);
                           await response.edit(embed.setDescription("You have arrived at the top floor! Enjoy your stay."));
                        }
                     }, 1000);
                  }, 1000);
               }, 1000);
            }

            break;
         }

         case "challenge": {
            if (message.author.id in data.guilds[messageGuild.id].triviaGames) {
               message.reply(embed.setDescription("You are already in a trivia game!"));
            } else if (commandBody.length < 3 || !message.mentions.members.first() || isNaN(commandBody[2])) {
               message.reply(embed.setTitle("!challenge").setDescription("Syntax: !challenge <user> <bet>"));
            } else {
               const triviaBet = parseInt(commandBody[2]);
               const triviaOpponent = message.mentions.members.first();
               if (triviaOpponent.user.bot) {
                  message.reply(embed.setDescription("You cannot challenge a bot."));
               } else if (triviaBet <= 0) {
                  message.reply(embed.setDescription("The minimum bet is 1 point."));
               } else if (data.guilds[messageGuild.id].members[message.author.id].points < triviaBet) {
                  message.reply(embed.setDescription("You cannot bet more than you have!"));
               } else if (data.guilds[messageGuild.id].members[triviaOpponent.id].points < triviaBet) {
                  message.reply(embed.setDescription("You cannot bet more than your opponent has!"));
               } else {
                  const response = await message.reply({
                     content: "",
                     embed: embed.setDescription(`${triviaOpponent}, you have been challenged by ${message.member} to a trivia game for **${triviaBet}** points! \nReact with :green_square: to accept or :red_square: to decline.`)
                  });
                  await response.react("🟥");
                  await response.react("🟩");
                  data.guilds[messageGuild.id].triviaChallenges[triviaOpponent.id] = {
                     message: response.id,
                     starter: message.author.id,
                     bet: triviaBet,
                  };
                  await writeFile("data.json", JSON.stringify(data));
               }
            }
            break;
         }

         case "resettrivia": {
            data.guilds[message.guild.id].triviaGames = {};
            data.guilds[message.guild.id].triviaChallenges = {};
            await writeFile("data.json", JSON.stringify(data));
            break;
         }

         case "chicken": {
            const chickenChance = data.guilds[messageGuild.id].members[message.author.id].chicken;
            const chickening = data.guilds[messageGuild.id].members[message.author.id].chickening;
            if (chickening) {
               message.reply(embed.setDescription("Hold on! You're chickening too fast..."));
            } else if (chickenChance < 50) {
               message.reply(embed.setDescription("You don't have a chicken! Buy one from the shop with `!buy chicken`"));
            } else if (commandBody.length < 2 || isNaN(commandBody[1]) || parseInt(commandBody[1]) <= 0) {
               message.reply(embed.setTitle("!chicken").setDescription("Syntax: !chicken <bet>"));
            } else if (parseInt(commandBody[1]) > data.guilds[messageGuild.id].members[message.author.id].points) {
               message.reply(embed.setDescription("You can't bet more than you have!"));
            } else {
               const bet = parseInt(commandBody[1]);
               const randomChance = Math.random() * 100;
               const response = await message.reply(embed.setDescription("Your chicken is fighting! Time left: 3"));
               data.guilds[messageGuild.id].members[message.author.id].chickening = true;
               await writeFile("data.json", JSON.stringify(data));
               // setTimeout(async function () {
               //     await response.edit(embed.setDescription("Your chicken is fighting! Time left: 2"));
               //     setTimeout(async function () {
               //         await response.edit(embed.setDescription("Your chicken is fighting! Time left: 1"));
               //         setTimeout(async function () {
               //             if (randomChance < chickenChance) {
               //                 const newChickenChance = chickenChance < 100 ? chickenChance + 1 : chickenChance;
               //                 data.guilds[messageGuild.id].members[message.author.id].points += bet;
               //                 data.guilds[messageGuild.id].members[message.author.id].chicken = newChickenChance;
               //                 await response.edit(embed.setTitle("Your chicken won!").setDescription(`You gained **${bet} points** and your chicken grew stronger. It now has a **${data.guilds[messageGuild.id].members[message.author.id].chicken}% chance** of winning future fights.`).setColor("#00FF00"));
               //             } else {
               //                 data.guilds[messageGuild.id].members[message.author.id].points -= bet;
               //                 data.guilds[messageGuild.id].members[message.author.id].chicken = 0;
               //                 await response.edit(embed.setTitle("Your chicken lost").setDescription(`You lost **${bet} points** and your chicken died.`).setColor("#FF0000"));                                
               //             }
               //             writeFile("data.json", JSON.stringify(data));
               //         }, 1000);
               //     }, 1000);
               // }, 1000);
               await sleep(1000);
               await response.edit(embed.setDescription("Your chicken is fighting! Time left: 2"));
               await sleep(1000);
               await response.edit(embed.setDescription("Your chicken is fighting! Time left: 1"));
               await sleep(1000);
               if (randomChance < chickenChance) {
                  const newChickenChance = chickenChance < 100 ? chickenChance + 1 : chickenChance;
                  data.guilds[messageGuild.id].members[message.author.id].points += bet;
                  data.guilds[messageGuild.id].members[message.author.id].chicken = newChickenChance;
                  await response.edit(embed.setTitle("Your chicken won!").setDescription(`You gained **${bet} points** and your chicken grew stronger. It now has a **${data.guilds[messageGuild.id].members[message.author.id].chicken}% chance** of winning future fights.`).setColor("#00FF00"));
               } else {
                  data.guilds[messageGuild.id].members[message.author.id].points -= bet;
                  data.guilds[messageGuild.id].members[message.author.id].chicken = 0;
                  await response.edit(embed.setTitle("Your chicken lost").setDescription(`You lost **${bet} points** and your chicken died.`).setColor("#FF0000"));
               }
               data.guilds[messageGuild.id].members[message.author.id].chickening = false;
               await writeFile("data.json", JSON.stringify(data));
            }
            break;
         }

         case "buy": {
            if (commandBody.length < 2 || !(commandBody[1] in shop)) {
               ; // Fallthrough to case "shop"
            } else {
               const itemBeingBought = commandBody[1];
               if (data.guilds[messageGuild.id].members[message.author.id].points < shop[itemBeingBought]) {
                  message.reply(embed.setDescription(`You don't have enough points to purchase this! \n\`${itemBeingBought}\` costs **${shop[itemBeingBought]} points.** \nYou have **${data.guilds[messageGuild.id].members[message.author.id].points}** points.`));
               } else if (data.guilds[messageGuild.id].members[message.author.id][itemBeingBought]) {
                  message.reply(embed.setDescription(`You already have \`${itemBeingBought}\`!`));
               } else {
                  if (itemBeingBought == "chicken") {
                     data.guilds[messageGuild.id].members[message.author.id].chicken = 50;
                  }
                  data.guilds[messageGuild.id].members[message.author.id].points -= shop[itemBeingBought];
                  await writeFile("data.json", JSON.stringify(data));
                  message.reply(embed.setDescription(`You bought one \`${itemBeingBought}\`. \nNew balance: ${data.guilds[messageGuild.id].members[message.author.id].points}`));
               }
               break;
            }
         }

         case "shop": {
            let shopDescription = "";
            Object.keys(shop).forEach((item) => {
               shopDescription += `\`${item}\` - ${shop[item]} points \n`;
            });
            message.reply(embed.setDescription(shopDescription));
            break;
         }

         case "test": {
            // const response = await message.reply({content: "", embed: embed.setDescription(`you have been challenged by ${message.member} to a trivia game for **${5}** points! \n
            //                                                         React with :green_square: to accept or :red_square: to decline.`)
            // });
            // const response = message.channel.send({ content: "", embed: embed.setDescription("yeet"), reply: "249992970235936768"});
            const filter = (reaction, user) => {
               return true;
            };
            const response = await message.reply("yeet");
            try {
               const collected = await response.awaitReactions(filter, { max: 1, time: 5000, errors: ["time"] })
               console.log("successful react");
            } catch (e) {
               console.log("made it into the error");
            }
            break;
         }

      }
   }

});

client.on("messageReactionAdd", async (reaction, user) => {
   let data = JSON.parse((await readFile("data.json")));
   const messageReactionGuild = data.guilds[reaction.message.guild.id];
   if (user.id in data.guilds[reaction.message.guild.id].triviaChallenges && messageReactionGuild.triviaChallenges[user.id].message == reaction.message.id) {
      const triviaOpponent = messageReactionGuild.triviaChallenges[user.id].starter;
      if (reaction.emoji.name == "🟩") {
         if (messageReactionGuild.members[user.id].points < messageReactionGuild.triviaChallenges[user.id].bet) {
            message.reply(embed.setDescription("You no longer have enough points to accept this challenge."));
         } else if (messageReactionGuild.members[triviaOpponent].points < messageReactionGuild.triviaChallenges[user.id].bet) {
            message.reply(embed.setDescription(`<@${messageReactionGuild.members[triviaOpponent]}> no longer has enough points for this challenge.`));
         } else {
            data.guilds[reaction.message.guild.id].triviaGames[triviaOpponent] = {
               opponent: user.id,
               bet: messageReactionGuild.triviaChallenges[user.id].bet,
               turn: true,
               correct: null,
            };
            data.guilds[reaction.message.guild.id].triviaGames[user.id] = {
               opponent: triviaOpponent,
               bet: messageReactionGuild.triviaChallenges[user.id].bet,
               turn: false,
               correct: null,
            };
            reaction.message.channel.send(embed.setDescription(`A trivia game has begun between <@${triviaOpponent}> and <@${user.id}> for ${messageReactionGuild.triviaChallenges[user.id].bet} points!`));
            delete data.guilds[reaction.message.guild.id].triviaChallenges[user.id];
            delete data.guilds[reaction.message.guild.id].triviaChallenges[triviaOpponent];
            await writeFile("data.json", JSON.stringify(data));
            triviaQuestion(reaction.message.guild.id, reaction.message.channel, triviaOpponent, 1);
         }
      } else if (reaction.emoji.name == "🟥") {
         reaction.message.channel.send({
            content: "",
            embed: embed.setDescription(`<@${user.id}> has declined the challenge.`),
            reply: triviaOpponent
         });
      }
   }
});

client.on("messageUpdate", (oldMessage, newMessage) => {
   let mcheck = newMessage.content.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\|]/g, "").split(" ");
   if (mcheck.includes("m") && !["308756179109281792", "472389625705660416", "188303679235948544"].includes(newMessage.author.id)) {
      newMessage.react(newMessage.guild.emojis.resolve("800821317796102210"));
   }
});

function resetEmbed() {
   embed = new Discord.MessageEmbed();
   embed.setAuthor("MOTMBot", client.user.displayAvatarURL());
   embed.setColor(3447003);
}

function sleep(ms) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

// Shuffle the answer choices in a challenge
function shuffle(array) {

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

async function triviaQuestion(guildID, channel, userID, depth) {
   resetEmbed();
   if (depth >= 50) {
      channel.send(embed.setTitle("Question limit reached!").setDescription("The max question count has been reached. The match has concluded in a tie."));
   } else {
      const data = JSON.parse((await readFile("data.json")));
      let guild = data.guilds[guildID];
      const questionResponse = await got(triviaAPI);
      const questionObject = JSON.parse(questionResponse.body);
      const opponentID = guild.triviaGames[userID].opponent;
      let answers = questionObject.results[0].incorrect_answers;
      const correctAnswer = questionObject.results[0].correct_answer;
      answers.push(correctAnswer);
      answers = shuffle(answers);
      const correctIndex = answers.indexOf(correctAnswer);
      const filter = (reaction, user) => {
         return ["🇦", "🇧", "🇨", "🇩"].includes(reaction.emoji.name) && user.id == userID;
      };
      const questionMessage = await channel.send({
         content: "",
         reply: userID,
         embed: embed.setTitle(`Question ${depth}`).setDescription(htmlDecode.decode(questionObject.results[0].question))
            .addField("A", htmlDecode.decode(answers[0]), true)
            .addField("B", htmlDecode.decode(answers[1]), true)
            .addField('\u200b', '\u200b')
            .addField("C", htmlDecode.decode(answers[2]), true)
            .addField("D", htmlDecode.decode(answers[3]), true),
      });
      await questionMessage.react("🇦");
      await questionMessage.react("🇧");
      await questionMessage.react("🇨");
      await questionMessage.react("🇩");
      try {
         const reaction = (await questionMessage.awaitReactions(filter, { max: 1, time: 10000, errors: ['time'] })).first();
         let chosenIndex = 0;
         switch (reaction.emoji.name) {
            case "🇦":
               chosenIndex = 0;
               break;
            case "🇧":
               chosenIndex = 1;
               break;
            case "🇨":
               chosenIndex = 2;
               break;
            case "🇩":
               chosenIndex = 3;
               break;
         }
         if (chosenIndex == correctIndex) {
            guild.triviaGames[userID].correct = true;
            if (guild.triviaGames[opponentID].correct == null) {
               questionMessage.reply(embed.setColor("#00FF00").setTitle("Correct").setDescription(`Your answer was correct! It's now <@${opponentID}>'s turn.`));
               await writeFile("data.json", JSON.stringify(data));
               triviaQuestion(guildID, channel, opponentID, depth + 1);
            } else if (guild.triviaGames[opponentID].correct) {
               questionMessage.reply(embed.setColor("#00FF00").setTitle("Correct").setDescription(`Your answer was correct! It's now <@${opponentID}>'s turn.`));
               guild.triviaGames[userID].correct = null;
               guild.triviaGames[opponentID].correct = null;
               await writeFile("data.json", JSON.stringify(data));
               triviaQuestion(guildID, channel, opponentID, depth + 1);
            } else {
               questionMessage.reply(embed.setColor("#00FF00").setTitle("Correct").setDescription(`Your answer was correct! You won the challenge and have received **${guild.triviaGames[userID].bet}** points.`));
               guild.members[userID].points += guild.triviaGames[userID].bet;
               guild.members[opponentID].points -= guild.triviaGames[opponentID].bet;
               delete guild.triviaGames[userID];
               delete guild.triviaGames[opponentID];
               await writeFile("data.json", JSON.stringify(data));
            }

         } else {
            guild.triviaGames[userID].correct = false;
            if (guild.triviaGames[opponentID].correct == null) {
               questionMessage.reply(embed.setColor("#FF0000").setTitle("Incorrect").setDescription(`The correct answer was **${htmlDecode.decode(correctAnswer)}**! It's now <@${opponentID}>'s turn.`));
               await writeFile("data.json", JSON.stringify(data));
               triviaQuestion(guildID, channel, opponentID, depth + 1);
            } else if (!guild.triviaGames[opponentID].correct) {
               questionMessage.reply(embed.setColor("#FF0000").setTitle("Incorrect").setDescription(`The correct answer was **${htmlDecode.decode(correctAnswer)}**! It's now <@${opponentID}>'s turn.`));
               guild.triviaGames[userID].correct = null;
               guild.triviaGames[opponentID].correct = null;
               await writeFile("data.json", JSON.stringify(data));
               triviaQuestion(guildID, channel, opponentID, depth + 1);
            } else {
               questionMessage.reply(embed.setColor("#FF0000").setTitle("Incorrect").setDescription(`The correct answer was **${htmlDecode.decode(correctAnswer)}**!`));
               questionMessage.reply(embed.setColor("#00FF00").setTitle("Congratulations").setDescription(`<@${opponentID}>, you won the challenge and have received **${guild.triviaGames[opponentID].bet}** points.`));
               guild.members[opponentID].points += guild.triviaGames[opponentID].bet;
               guild.members[userID].points -= guild.triviaGames[userID].bet;
               delete guild.triviaGames[userID];
               delete guild.triviaGames[opponentID];
               await writeFile("data.json", JSON.stringify(data));
            }
         }
      } catch (e) {
         guild.triviaGames[userID].correct = false;
         if (guild.triviaGames[opponentID].correct == null) {
            questionMessage.reply(embed.setColor("#FF0000").setTitle("Timeout").setDescription(`The correct answer was **${htmlDecode.decode(correctAnswer)}**! It's now <@${opponentID}>'s turn.`));
            await writeFile("data.json", JSON.stringify(data));
            triviaQuestion(guildID, channel, opponentID, depth + 1);
         } else if (!guild.triviaGames[opponentID].correct) {
            questionMessage.reply(embed.setColor("#FF0000").setTitle("Timeout").setDescription(`The correct answer was **${htmlDecode.decode(correctAnswer)}**! It's now <@${opponentID}>'s turn.`));
            guild.triviaGames[userID].correct = null;
            guild.triviaGames[opponentID].correct = null;
            await writeFile("data.json", JSON.stringify(data));
            triviaQuestion(guildID, channel, opponentID, depth + 1);
         } else {
            questionMessage.reply(embed.setColor("#FF0000").setTitle("Timeout").setDescription(`The correct answer was **${htmlDecode.decode(correctAnswer)}**!`));
            questionMessage.reply(embed.setColor("#00FF00").setTitle("Congratulations").setDescription(`<@${opponentID}>, you won the challenge and have received **${guild.triviaGames[opponentID].bet}** points.`));
            guild.members[opponentID].points += guild.triviaGames[opponentID].bet;
            guild.members[userID].points -= guild.triviaGames[userID].bet;
            delete guild.triviaGames[userID];
            delete guild.triviaGames[opponentID];
            await writeFile("data.json", JSON.stringify(data));
         }
      }
   }
}

client.login(auth.token);