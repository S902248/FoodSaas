const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'db.json');

// Read DB from file
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    return {};
  }
}

// Write DB to file
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Helper to filter items based on query
function matchQuery(item, query) {
  if (!query) return true;
  for (const key in query) {
    const val = query[key];
    
    // Support regex object
    if (val && typeof val === 'object' && val.$regex) {
      const regex = val.$regex instanceof RegExp ? val.$regex : new RegExp(val.$regex, 'i');
      if (!regex.test(item[key])) return false;
      continue;
    }

    if (val instanceof RegExp) {
      if (!val.test(item[key])) return false;
      continue;
    }

    // Support comparison operators like $gt, $gte, $lt, $lte, $ne
    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof RegExp)) {
      let isComparison = false;
      const itemVal = item[key];
      const getTimestamp = (v) => {
        if (v instanceof Date) return v.getTime();
        if (typeof v === 'string' && !isNaN(Date.parse(v))) return Date.parse(v);
        return v;
      };
      
      const itemTime = getTimestamp(itemVal);

      if ('$gt' in val) {
        isComparison = true;
        if (!(itemTime > getTimestamp(val.$gt))) return false;
      }
      if ('$gte' in val) {
        isComparison = true;
        if (!(itemTime >= getTimestamp(val.$gte))) return false;
      }
      if ('$lt' in val) {
        isComparison = true;
        if (!(itemTime < getTimestamp(val.$lt))) return false;
      }
      if ('$lte' in val) {
        isComparison = true;
        if (!(itemTime <= getTimestamp(val.$lte))) return false;
      }
      if ('$ne' in val) {
        isComparison = true;
        if (itemVal === val.$ne) return false;
      }
      if (isComparison) continue;
    }
    
    // Basic match
    const itemVal = item[key];
    if (itemVal === val) continue;
    
    // Handle ObjectId strings vs objects
    if (itemVal && val && (itemVal.toString() === val.toString())) {
      continue;
    }
    
    return false;
  }
  return true;
}

// Helper to apply updates
function applyUpdate(item, update) {
  const result = { ...item };
  if (update.$set) {
    Object.assign(result, update.$set);
  } else {
    // Check if there are mongo operators
    let hasOperators = false;
    for (const key in update) {
      if (key.startsWith('$')) {
        hasOperators = true;
      }
    }
    if (hasOperators) {
      if (update.$inc) {
        for (const k in update.$inc) {
          result[k] = (Number(result[k]) || 0) + Number(update.$inc[k]);
        }
      }
    } else {
      Object.assign(result, update);
    }
  }
  return result;
}

class Query {
  constructor(promise) {
    this.promise = promise;
  }
  
  then(onFulfilled, onRejected) {
    return this.promise.then(onFulfilled, onRejected);
  }
  
  catch(onRejected) {
    return this.promise.catch(onRejected);
  }
  
  sort(sortObj) {
    this.promise = this.promise.then(items => {
      if (!Array.isArray(items)) return items;
      const sorted = [...items];
      const key = Object.keys(sortObj)[0];
      const dir = sortObj[key];
      sorted.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        if (valA < valB) return dir === -1 ? 1 : -1;
        if (valA > valB) return dir === -1 ? -1 : 1;
        return 0;
      });
      return sorted;
    });
    return this;
  }
  
  select(fieldsStr) {
    this.promise = this.promise.then(res => {
      if (!res) return res;
      const removeFields = fieldsStr.split(' ').filter(f => f.startsWith('-')).map(f => f.slice(1));
      const keepFields = fieldsStr.split(' ').filter(f => !f.startsWith('-') && f !== '');
      
      const sanitize = (item) => {
        const copy = new item.constructor(item);
        removeFields.forEach(f => delete copy[f]);
        if (keepFields.length > 0) {
          const newCopy = new item.constructor();
          keepFields.forEach(f => {
            if (f in copy) newCopy[f] = copy[f];
          });
          newCopy._id = copy._id;
          newCopy.id = copy.id;
          return newCopy;
        }
        return copy;
      };
      
      if (Array.isArray(res)) {
        return res.map(sanitize);
      }
      return sanitize(res);
    });
    return this;
  }
  
  populate(path, select) {
    this.promise = this.promise.then(res => {
      if (!res) return res;
      const dbData = readDB();
      
      const doPopulate = (item) => {
        if (!item || !item[path]) return item;
        const refId = item[path].toString();
        
        const modelName = path.charAt(0).toUpperCase() + path.slice(1);
        const refObjList = dbData[modelName] || [];
        const refObj = refObjList.find(r => r._id === refId);
        
        if (refObj) {
          const copy = new item.constructor(item);
          const TargetModel = models[modelName] || Model;
          const popInstance = new TargetModel(refObj);

          if (select) {
            const fields = select.split(' ').filter(Boolean);
            const popObj = new TargetModel();
            fields.forEach(f => {
              if (f === 'name' && !refObj.name && refObj.restaurantName) {
                popObj.name = refObj.restaurantName;
              } else if (f in popInstance) {
                popObj[f] = popInstance[f];
              }
            });
            popObj._id = popInstance._id;
            popObj.id = popInstance.id;
            copy[path] = popObj;
          } else {
            copy[path] = popInstance;
          }
          return copy;
        }
        return item;
      };
      
      if (Array.isArray(res)) {
        return res.map(doPopulate);
      }
      return doPopulate(res);
    });
    return this;
  }
}

class Model {
  constructor(data) {
    Object.assign(this, data);
    
    // Apply schema defaults if available
    const schema = this.constructor.schema;
    if (schema && schema.definition) {
      for (const key in schema.definition) {
        if (this[key] === undefined) {
          const fieldDef = schema.definition[key];
          if (fieldDef && typeof fieldDef === 'object' && fieldDef.default !== undefined) {
            this[key] = typeof fieldDef.default === 'function' ? fieldDef.default() : fieldDef.default;
          }
        }
      }
    }

    if (!this._id) {
      this._id = crypto.randomBytes(12).toString('hex');
    }
    if (!this.id) {
      this.id = this._id;
    }
    if (!this.createdAt) {
      this.createdAt = new Date().toISOString();
    }
    if (!this.updatedAt) {
      this.updatedAt = new Date().toISOString();
    }
    
    // Alias restaurantName to name for compatibility with typos in trackScan
    if (this.restaurantName && !this.name) {
      this.name = this.restaurantName;
    }
  }

  async save() {
    const modelName = this.constructor.modelName;
    const dbData = readDB();
    if (!dbData[modelName]) dbData[modelName] = [];
    
    // Create copy to sanitize populated fields before saving
    const toSave = {};
    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        const val = this[key];
        if (val && typeof val === 'object' && val._id && key !== '_id') {
          toSave[key] = val._id;
        } else {
          toSave[key] = val;
        }
      }
    }

    const idx = dbData[modelName].findIndex(d => d._id === this._id);
    if (idx >= 0) {
      toSave.updatedAt = new Date().toISOString();
      dbData[modelName][idx] = toSave;
    } else {
      dbData[modelName].push(toSave);
    }
    
    writeDB(dbData);
    
    // Update local properties to match saved state without overwriting populated fields
    for (const key in toSave) {
      const originalVal = this[key];
      const savedVal = toSave[key];
      if (originalVal && typeof originalVal === 'object' && originalVal._id && typeof savedVal === 'string' && originalVal._id === savedVal) {
        continue;
      }
      this[key] = savedVal;
    }
    return this;
  }

  async deleteOne() {
    const modelName = this.constructor.modelName;
    const dbData = readDB();
    if (dbData[modelName]) {
      dbData[modelName] = dbData[modelName].filter(d => d._id !== this._id);
      writeDB(dbData);
    }
    return { deletedCount: 1 };
  }

  static find(query) {
    const modelName = this.modelName;
    const dbData = readDB();
    const items = dbData[modelName] || [];
    const filtered = items.filter(item => matchQuery(item, query));
    const instances = filtered.map(item => new this(item));
    return new Query(Promise.resolve(instances));
  }

  static findOne(query) {
    const modelName = this.modelName;
    const dbData = readDB();
    const items = dbData[modelName] || [];
    const found = items.find(item => matchQuery(item, query));
    return new Query(Promise.resolve(found ? new this(found) : null));
  }

  static findById(id) {
    return this.findOne({ _id: id });
  }

  static async findByIdAndUpdate(id, update, options = {}) {
    const modelName = this.modelName;
    const dbData = readDB();
    const items = dbData[modelName] || [];
    const idx = items.findIndex(item => item._id === id);
    if (idx === -1) return null;
    
    const updatedItem = applyUpdate(items[idx], update);
    updatedItem.updatedAt = new Date().toISOString();
    items[idx] = updatedItem;
    writeDB(dbData);
    return new this(updatedItem);
  }

  static findOneAndUpdate(query, update, options = {}) {
    const modelName = this.modelName;
    const dbData = readDB();
    const items = dbData[modelName] || [];
    const idx = items.findIndex(item => matchQuery(item, query));
    if (idx === -1) {
      return new Query(Promise.resolve(null));
    }
    
    const updatedItem = applyUpdate(items[idx], update);
    updatedItem.updatedAt = new Date().toISOString();
    items[idx] = updatedItem;
    writeDB(dbData);
    return new Query(Promise.resolve(new this(updatedItem)));
  }

  static async findByIdAndDelete(id) {
    return this.findOneAndDelete({ _id: id });
  }

  static async findOneAndDelete(query) {
    const modelName = this.modelName;
    const dbData = readDB();
    const items = dbData[modelName] || [];
    const idx = items.findIndex(item => matchQuery(item, query));
    if (idx === -1) return null;
    
    const deleted = items[idx];
    items.splice(idx, 1);
    writeDB(dbData);
    return new this(deleted);
  }

  static async insertMany(arr) {
    const modelName = this.modelName;
    const dbData = readDB();
    if (!dbData[modelName]) dbData[modelName] = [];
    
    const instances = arr.map(item => new this(item));
    dbData[modelName].push(...instances.map(inst => ({ ...inst })));
    writeDB(dbData);
    return instances;
  }

  static async deleteMany(query = {}) {
    const modelName = this.modelName;
    const dbData = readDB();
    if (dbData[modelName]) {
      if (Object.keys(query).length === 0) {
        dbData[modelName] = [];
      } else {
        dbData[modelName] = dbData[modelName].filter(item => !matchQuery(item, query));
      }
      writeDB(dbData);
    }
    return { deletedCount: 1 };
  }
}

const models = {};

function model(name, schema) {
  if (models[name]) return models[name];
  
  const CustomModel = class extends Model {};
  CustomModel.modelName = name;
  CustomModel.schema = schema;
  models[name] = CustomModel;
  return CustomModel;
}

class Schema {
  constructor(definition, options) {
    this.definition = definition;
    this.options = options;
  }
}

Schema.Types = {
  ObjectId: String
};

const mockMongoose = {
  Schema,
  model,
  connect: (uri) => {
    console.log('Connected to local Mock JSON Database at backend/db.json');
    return Promise.resolve(true);
  },
  connection: {
    on: () => {},
    once: () => {}
  },
  Types: {
    ObjectId: (id) => id || crypto.randomBytes(12).toString('hex')
  }
};

module.exports = mockMongoose;
