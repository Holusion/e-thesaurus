
import {open as openDatabase, ISqlite, Database as IDatabase } from "sqlite";
import sqlite from "sqlite3";
import config from "../../utils/config";

export interface DbOptions {
  filename:string;
  migrate ?:boolean|"force";
}

interface TransactionWork<T>{
  (db :Transaction) :Promise<T>;
}
export interface Database extends IDatabase{
  /**
   * opens a new connection to the database to perform a transaction
   */
  beginTransaction :(<T>(work :TransactionWork<T>, commit ?:boolean)=>Promise<T>);
}
export interface Transaction extends Database{}

async function openAndConfigure({filename, migrate=true} :DbOptions){
  let db = await openDatabase({
    filename,
    driver: sqlite.Database, 
    mode: sqlite.OPEN_URI|sqlite.OPEN_CREATE|sqlite.OPEN_READWRITE,
  });
  await db.run(`PRAGMA foreign_keys = ON`);
  await db.run(`PRAGMA synchronous = NORMAL`);
  return db;
}


export default async function open({filename, migrate=true} :DbOptions) :Promise<Database> {
  let db = await openAndConfigure({
    filename,
  });
  //Required only once but can't be set in migration. Should probably move to some one-time function
  await db.run(`PRAGMA journal_mode = WAL`);
  //Must be run with each connections
  if(migrate !== false){
    await db.migrate({
      force: ((migrate === "force")?true: false),
      migrationsPath: config.migrations_path,
    });
  }
  (db as Database).beginTransaction = async function(work :TransactionWork<any>, commit :boolean = true){
    let conn = await openAndConfigure({filename: db.config.filename}) as Transaction;
    conn.beginTransaction = async function(work :TransactionWork<any>){
      return await work(conn);
    }
    if(commit) await conn.run(`BEGIN TRANSACTION`);
    try{
      let res = await work(conn);
      if(commit) await conn.run("END TRANSACTION");
      return res;
    }finally{
      //Close will automatically rollback the transaction if it wasn't committed
      await conn.close();
    }
  };
  return db as Database;
}
