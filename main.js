const { Client, Intents, MessageAttachment } = require('discord.js');
const creds = require('./credentials.json');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
//npm canvas
//discord js
const fs = require("fs");

const { createCanvas, loadImage } = require('canvas')

const commands = [
  //make sure not to go under 25 when deleting
  //make sure to write the person who owns which board
  new SlashCommandBuilder()
    .setName('board')
    .setDescription('You will get your board.')
    .toJSON(),
  {
    name: 'end',
    description: 'The game is ending now. Good game!'
  },
  {
    name: "list-squares",
    description: "Lists all the squares on the board"
  },
  {
    name: "show-all",
    description: "Show all the boards playing in the game"
  },
  new SlashCommandBuilder()
    .setName('fill')
    .setDescription('Fill in the square on everyone\'s board')
    .addIntegerOption(option => option.setName('input').setDescription('Square index').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('unfill')
    .setDescription('unfill the square on everyone\'s board')
    .addIntegerOption(option => option.setName('input').setDescription('Square index').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('show')
    .setDescription('Show your board in the game')
    //.addStringOption(option => option.setName('input').setDescription('Your name').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('remove-square')
    .setDescription('Removes a square from the list')
    .addIntegerOption(option => option.setName('input').setDescription('Square index').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('add-square')
    .setDescription('Adds a square to the list')
    .addStringOption(option => option.setName('input').setDescription('Enter new square').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('list-filled')
    .setDescription('Lists all the squares filled in')
    .toJSON()
];
const rest = new REST({ version: '9' }).setToken(creds.token);

let player_map = {};

let winners = new Set();

let filled_squares = new Set([-1]);

const board_has_bingo = (board) => {
  let lines_to_check = []
  const line_has_bingo = (line) => {
    return line
           .map((square) => square.index)
           .map((index) => index === -1 || filled_squares.has(index))
           .reduce((a,b) => a && b)
  }
  const get_col = (i) => board.map((row) => row[i])

  for(let i = 0; i < board.length; i++){
    lines_to_check.push(board[i]);
    lines_to_check.push(get_col(i));
  }
  lines_to_check.push([
    board[0][0],
    board[1][1],
    board[2][2],
    board[3][3],
    board[4][4]
  ])
  lines_to_check.push([
    board[0][4],
    board[1][3],
    board[2][2],
    board[3][1],
    board[4][0]
  ])
  for(let line of lines_to_check){
    if(line_has_bingo(line)) return true;
  }
  return false;
}

const get_squares = () => {
  const raw = fs.readFileSync("./squares.txt", "utf8");
  const lines = raw.split("\n");
  return lines;
}

const generate_board = () => {
  const lines = get_squares();
  const already_used_map = {};
  const collected_random_squares = [];
  const final_board = [[], [], [], [], []];
  for (let a = 0; a < 24; a++) {
    let random_index;
    let selected_square;
    do {
      random_index = Math.floor(Math.random() * lines.length);
      selected_square = lines[random_index];
    } while (already_used_map[random_index]);
    already_used_map[random_index] = true;
    collected_random_squares.push({
      selected_square,
      index: random_index
    });
  }
  for (let a = 0; a < final_board.length; a++) {
    for (let b = 0; b < 5; b++) {
      if (a === 2 && b === 2) {
        final_board[a].push({
          selected_square: "FREE",
          index: -1
        });
      } else {
        final_board[a].push(collected_random_squares.shift());
      }
    }
  }
  return final_board;
}

const create_user_img = (board, username) => {
  const canvas = createCanvas(500, 500);
  const ctx = canvas.getContext('2d');
  ctx.font = '10px Impact';
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 500, 500);
  ctx.fillStyle = 'black';
  ctx.strokeRect(0, 0, 500, 500);
  ctx.textAlign = 'center';

  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(100 * (i + 1), 0);
    ctx.lineTo(100 * (i + 1), 500);
  }
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(0, 100 * (i + 1));
    ctx.lineTo(500, 100 * (i + 1));
  }
  ctx.stroke();

  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      ctx.fillText(board[i][j].index, (100 * i)+ 10, (100 * j) + 10);

      let final_text = format_text(ctx, board[i][j].selected_square);
      const metrics = ctx.measureText(final_text)
      const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      const y = 55 + (j * 100) - (height / 2);
      ctx.fillText(final_text, 50 + (i * 100), y);
    }
  }
  //username
  const metrics2 = ctx.measureText(username)
  const height2 = metrics2.actualBoundingBoxAscent + metrics2.actualBoundingBoxDescent;
  ctx.textAlign = 'right';
  ctx.fillText(username, 490, 500-height2);
  ctx.textAlign = 'center';
  ctx.beginPath();
  // Add X for square that are already marked
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      for(let curr of filled_squares){
        //console.log(curr + "-" + board[i][j].index);
        if(curr === board[i][j].index){
          // console.log(i + ' ' + j);
          // console.log('Coordinates:'+ (100 * (i + 1) - 100) + ' ' + 100 * (i + 1));
          ctx.moveTo(100 * i , 100 * j);
          ctx.lineTo(100 * (i + 1), 100 * (j + 1));
          ctx.moveTo(100 * (i + 1), 100 * j);
          ctx.lineTo(100 * i, 100 * (j + 1));
        }
      }
    }
  }
  ctx.strokeStyle = '#ff0000';
  ctx.stroke();
  const attachment = new MessageAttachment(canvas.toBuffer(), 'user_board.png');
  return attachment;
}


const format_text = (ctx, long_text) => {
  let arr_text = long_text.split(' ');
  let smaller_text = '';
  let final_str = '';

  for (let [index, x] of arr_text.entries()) {
    let current_size = ctx.measureText(smaller_text + ' ' + x).width;

    if (current_size >= 80) {
      final_str = final_str + smaller_text + '\n';
      smaller_text = x;
    } else {
      if (index === 0) {
        smaller_text = x;
      } else {
        smaller_text = `${smaller_text} ${x}`;
      }
    }
  }
  if (smaller_text != '') {
    final_str = final_str + smaller_text;
  }
  return final_str;
}

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(creds.application_id, "667811230836326400"),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
  console.log('Ready!');
});


client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  switch (interaction.commandName) {
    case "board":
      if(!player_map[interaction.user.username]){
        let board = generate_board();
        const attachment = create_user_img(board, interaction.user.username);
        player_map[interaction.user.username] = board;
        await interaction.reply({ files: [attachment] });
      } else{
        await interaction.reply('Can\'t make a new board, you already have one!');
      }
      break;
    case "end":
      player_map = {};
      filled_squares = new Set([-1]);
      await interaction.reply("Clearing all the boards in database!");
      break;
    case "list-squares":
      const squares = get_squares();
      for (let [index, square] of squares.entries()) {
        squares[index] = `${index}: ${square}`;
      }
      await interaction.reply(`LISTING SQUARES:\n${squares.join("\n")}`);
      break;
    case "show-all":
      // await interaction.reply({ files: [
      //     Object.keys(player_map)
      //     .map(key => player_map[key])
      //     .map(v => create_user_img(v))
      //   ]
      // });

      let boards = Object.keys(player_map).map(key => player_map[key]);
      let usernames = Object.keys(player_map);
      if (boards.length === 0){
        await interaction.reply('No boards created yet');
      }
      for(let i = 0; i< boards.length;i++){
        const attachment = create_user_img(boards[i], usernames[i]);
        if(i===0){
          await interaction.reply({ files: [attachment] });
        }else{
          await interaction.followUp({ files: [attachment] });
        }
      }
      break;
    case "fill": {
      const square_index = interaction.options.getInteger("input");
      filled_squares.add(square_index);
      await interaction.reply(`FILLED SQUARE ${square_index}`);
      //check for bingo for all boards
      let str = ""
      for(let key of Object.keys(player_map)){
        const board = player_map[key];
        if(board_has_bingo(board) && !Array.from(winners).includes(key)){
          str = str +`${key}'s board has Bingo!!!!\n`;
          winners.add(key);
        }
      }
      if(str != ""){
        await interaction.followUp(str);
      }
      break;
    }
    case "unfill": {
      const square_index = interaction.options.getInteger("input");
      if (square_index === -1) {
        await interaction.reply('You are free to fuck off');
      }
      else {
        filled_squares.delete(square_index);
        await interaction.reply(`UNFILLED SQUARE ${square_index}`);
      }
      break;
    }
    case "show":{
      if (player_map[interaction.user.username]){
        let board = player_map[interaction.user.username];
        const attachment = create_user_img(board, interaction.user.username);
        await interaction.reply({ files: [attachment] });
        //await interaction.followUp(`${interaction.user.username}'s Board`);
      }
      else {
        await interaction.reply('No board found. /board to create one!');
      }
      break;
    }
    case "add-square":{
      let boards = Object.keys(player_map).map(key => player_map[key]);
      if (boards.length !== 0){
        await interaction.reply('Game is on going. Wait until it has ended!');
      }
      else {
        const str = interaction.options.getString('input');
        try {
          fs.appendFileSync("./squares.txt", `\n${str}`);
          await interaction.reply('Congrats, input is in our files!');
        } catch (error) {
          await interaction.reply('Uh oh! Something went wrong, please try again.');
          console.error(error);
        }
      }
      break;
    }
    case "remove-square":{
      let boards = Object.keys(player_map).map(key => player_map[key]);
      if (boards.length !== 0){
        await interaction.reply('Game is on going. Wait until it has ended!');
      }
      else{
        let curr_squares = get_squares();
        const index = interaction.options.getInteger('input'); //try catch is it in not available in the list
        curr_squares.splice(index, 1);
        fs.writeFileSync("./squares.txt", curr_squares.join("\n"));
        await interaction.reply('Removed square!');
      }
      break;
    }
    case "list-filled":{
      if (Array.from(filled_squares).splice(1).length === 0){
        await interaction.reply('No squares are filled in yet!')
      }
      else{
        const squares = get_squares();
        const fills = Array.from(filled_squares).slice(1).map((i) => `${i}: ${squares[i]}`)
        await interaction.reply(`FILLED SQUARES:\n${fills.join("\n")}`);
        break;
      }
    }
  }
});

client.login(creds.token);
