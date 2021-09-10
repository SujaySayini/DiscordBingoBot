const { Client, Intents, MessageAttachment } = require('discord.js');
const creds = require('./credentials.json');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const fs = require("fs");

const { createCanvas, loadImage } = require('canvas')

const commands = [
  //make sure not to go under 25 when deleting 
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
    .toJSON()
];
const rest = new REST({ version: '9' }).setToken(creds.token);

const player_map = {};

const filled_squares = new Set();

const board_has_bingo = (board) => {
  let lines_to_check = []
  const line_has_bingo = (line) => {
    return line
           .map((square) => square.index)
           .map((index) => index === -1 || filled_squares.has(index))
           .reduce((a,b) => a && b)
  }
  const get_col = (i) => board.map((row) => row[i]).flat()
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

/*
let test_board = [
  [1,2,3,4,5],
  [6,1,8,9,10],
  [11,12,-1,14,15],
  [16,17,18,1,20],
  [21,22,23,24,1]
].map(i => i.map((index) => {
  return {
    index
  }
}))
*/

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
          selected_square:"FREE",
          index: -1
        });
      } else {
        final_board[a].push(collected_random_squares.shift());
      }
    }
  }
  return final_board;
}

const create_user_img = (board) => {
  const canvas = createCanvas(500, 500);
  const ctx = canvas.getContext('2d');
  ctx.font = '10px Impact';
  //ctx.fillText('Awesome!', 50, 100);
  ctx.fillStyle = 'white';
  ctx.fillRect(0,0,500,500);
  ctx.fillStyle = 'black';
  ctx.strokeRect(0, 0, 500, 500);
  ctx.textAlign = 'center';

  ctx.beginPath();
  for(let i = 0; i<4; i++){
    ctx.moveTo(100 * (i+1), 0);   
    ctx.lineTo(100 * (i+1), 500);
  }
  for(let i = 0; i<4; i++){
    ctx.moveTo(0, 100 * (i+1));   
    ctx.lineTo(500, 100 * (i+1));
  }
  ctx.stroke();

  for(let i = 0; i<5; i++){ 
    for(let j = 0; j<5;j++){

      let final_text = format_text(ctx, board[i][j].selected_square, board[i][j].index);
      const metrics = ctx.measureText(final_text)
      const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      const y = 50 + (j * 100) - (height/2);
      ctx.fillText(final_text, 50 + (i*100), y);
    }
  }  
// Add X for square that are already marked

for(let i = 0; i<5; i++){ 
  for(let j = 0; j<5;j++){

  }
}
  const attachment = new MessageAttachment(canvas.toBuffer(), 'user_board.png');
  return attachment;
}


const format_text = (ctx, long_text, index) => {
  let arr_text = long_text.split(' ');
  let smaller_text = '';
  let final_str = '';

  for(let [index, x] of arr_text.entries()){
    let current_size = ctx.measureText(smaller_text + ' ' + x).width; 

    if(current_size >= 80) {
      final_str = final_str + smaller_text + '\n';
      smaller_text = x;
    }else{
      if(index === 0){
        smaller_text = x;
      }else{
        smaller_text = `${smaller_text} ${x}`;
      }
    }
  }
  if(smaller_text != ''){
    final_str = final_str + smaller_text;
  }
  return final_str ;//+ '\n' + index;
}

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(creds.application_id, "882126573787037716"),
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
      let board = generate_board();
      const attachment = create_user_img(board);
      player_map[interaction.user.username] = board;
      await interaction.reply({ files: [attachment] });
      break;
    case "end":
      player_map = {};
      selected_square.clear();
      break;
    case "list":
      const squares = get_squares();
      for (let [index, square] of squares.entries()) {
        squares[index] = `${index}: ${square}`;
      }
      await interaction.reply(`LISTING SQUARES:\n${squares.join("\n")}`);
      break;
    case "show-all-boards":
      break;
    case "fill":{
      const square_index = interaction.options.getInteger("input");
      filled_squares.add(square_index);
      await interaction.reply(`FILLED SQUARE ${square_index}`);
      break;
    }
    case "unfill":{
      const square_index = interaction.options.getInteger("input");
      filled_squares.delete(square_index);
      await interaction.reply(`UNFILLED SQUARE ${square_index}`);
      break;
    }
    case "show-all":
      await interaction.reply("test");
      break;
    case "show":

      break;
    case "add-square":
      const str = interaction.options.getString('input');
      try {
        fs.appendFileSync("./squares.txt", `\n${str}`);
        await interaction.reply('Congrats, input is in our files!');
      } catch (error) {
        await interaction.reply('Uh oh! Something went wrong, please try again.');
        console.error(error);
      }
      break;
    case "remove-square":
      let curr_squares = get_squares();
      const index = interaction.options.getInteger('input');
      curr_squares.splice(index, 1);
      fs.writeFileSync("./squares.txt", curr_squares.join("\n"));
      await interaction.reply('Removed square!');
      break;
  }
});

client.login(creds.token);