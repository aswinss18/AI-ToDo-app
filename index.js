import {db} from './db/index.js';
import { todosTable } from './db/schema.js';
import {ilike,eq} from "drizzle-orm"

import OpenAI from 'openai';

import readlineSync from "readline-sync"

// Tools

const client=new OpenAI()

async function getAllTodos(){

const todos=await db.select().from(todosTable);
return todos;

}

async function createTodo(todo){
const [result]=await db.insert(todosTable).values({todo}).returning({id:todosTable.id})

return result.id
}

async function searchToDo(query) {

    const todos=await db.select().from(todosTable).where(ilike(todosTable.todo,`%${query}%`))

    return todos
    
}

async function deleteToDoById(id) {

await db.delete(todosTable).where(eq(todosTable.id,id))

}


const toolsAvailable={getAllTodos,createTodo,searchTodo:searchToDo,deleteTodoById:deleteToDoById}

const SYSTEM_PROMPT = `
You are an AI To-Do List Assistant with START, PLAN, ACTION, Observation, and Output State.
Wait for the user prompt and first PLAN using available tools.
After Planning, take the ACTION with appropriate tools and wait for Observation based on the action.
Once you get the observations, return the AI response based on the START prompt and observations.

 You can manage tasks by adding, viewing, updating, deleting, and searching them in a database.
You must strictly follow the JSON output format specified for each request.

Todo DB Schema:
id: Int and Primary Key
todo: String
created_at: DateTime
updated_at: DateTime

Available Tools:
- getAllTodos(): Returns all the Todos from the database.
- createTodo(todo: string): Creates a new Todo in the database and returns the newly created record ID.
- deleteTodoById(id: string): Deletes the todo by ID given in the input and returns a confirmation message.
- searchTodo(query: string): Searches for all todos matching the query and returns the list of matching todos.

Instructions:
1. Every response you provide must be in the specified JSON format.
2. Do not include any explanations, only return the JSON data.
3. Validate the input and respond with appropriate error messages in JSON if something is missing or incorrect.
4. Always include created_at and updated_at fields when returning todo objects.
5. You should handle requests such as "add a new todo", "show all todos", "delete a todo", or "search todos".

Example JSON output for getAllTodos:

START

{ "type": "user", "user": "Add a task for shopping groceries." }
{ "type": "plan", "plan": "I will try to get more context on what user needs to shop." }
{ "type": "output", "output": "Can you tell me what all items you want to shop for?" }
{ "type": "user", "user": "I want to shop for milk, kurkure, lays and choco." }
{ "type": "plan", "plan": "I will use createTodo to create a new Todo in DB." }
{ "type": "action", "function": "createTodo", "input": "Shopping for milk, kurkure, lays and choco." }
{ "type": "observation", "observation": "2" }
 { "type": "output", "observation": "Your todo has been added successfully." }

Start by waiting for the user's input.
`;


const messages=[{role:"system",content:SYSTEM_PROMPT}]


while (true) {
    const query =readlineSync.question(">>")
    const userMessage={type:"user",user:query}

    messages.push({role:'user',content:JSON.stringify(userMessage)})

    while (true) {
        const chat=await client.chat.completions.create({model:"gpt-4o-mini",messages:messages,response_format:{type:"json_object"}})
        const result=chat.choices[0].message.content

        messages.push({role:"assistant",content:result})

        const action =JSON.parse(result)

        if (action.type==="output") {
            console.log(`🤖: ${action.output}`)
            break
        }else if (action.type === 'action') {
  const fn = toolsAvailable[action.function];
  if (!fn) throw new Error('Invalid Tool Call');
  const observation = await fn(action.input);
  const observationMessage = {
    type: 'observation',
    observation: observation,
  };

  messages.push({role:"developer",content:JSON.stringify(observationMessage)})
}

    }
}