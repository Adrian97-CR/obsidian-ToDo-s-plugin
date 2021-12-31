import { copyFileSync } from 'fs';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ListedFiles } from 'obsidian';

// Remember to rename these classes and interfaces!

interface ToDosSettings {
	mySetting: string;
}

interface Note {
	name:string;
	deadline:Date;
	status:string;
	objective:string[],
	delete?:boolean;
	delBand?:number;
}
const DEFAULT_SETTINGS: ToDosSettings = {
	mySetting: 'default'
}

export default class toDosPlugin extends Plugin {
	settings: ToDosSettings;
	/**
	 * actualiza los datos de la nota
	 */
	createNewTaskNote(note:Note, file:string){
		let comp:string = '';
		let act:string = '';
		let i = note.objective.length+2;
		let now = new Date(Date().replace('GMT+0000','GMT-0600'))
		let auxObj = note.objective[0];
		let compTask:string[] = [];
		note.objective = note.objective.filter((obj:string)=>{
			let band = -1!=obj.search(/!listo/);
			if(band){
				compTask.push(obj.replace(/!listo/,'')+'|'+now.getHours()+':'+now.getMinutes());
				comp+=obj.replace(/!listo/,'')+'|[['+now.getFullYear()+'-'+(now.getMonth()+1)+'-'+now.getDate()+']]\n';
			}
			else{
				act+=obj+'\n'
			}
			return !band;
		});
		if(note.objective.length==0){
			note.delete = true;
			note.status = auxObj.replace(/!listo/,'');
		}
		let line = file.split(/\n/);
		file = note.deadline.getFullYear()+'-'+(note.deadline.getMonth()+1)+'-'+note.deadline.getDate()+'\n'+line[1]+'\n'+act;
		while(true){
			file += line[i]+'\n';
			if (line[i].substring(0,2)==='--') {
				i++;
				break;
			}
			i++;
		}
		file += comp;
		line.slice(i).forEach(line=>{
			if(line.length > 3)
				file+=line+'\n';
		});
		return [file,compTask.join('\n')];
	}

	getNewTask(reader:any, note:Note){
		let auxTask:string[] = []
		reader = reader.split('\n').slice(0,-1);
		note.deadline = new Date(reader[0].split('-'))
		let i = 2;
		for (; i < reader.length; i++) {
			if(reader[i].substring(0,1)!=='#') {
				auxTask.push(reader[i]);
			}
			else break;
		}
		i++;
		note.objective = auxTask;
		note.status = reader[i].substring(0,1)!=='#'?reader[i]:'';
		return
	}

	sortFunction(a:Note,b:Note){
		var dateA = a.deadline.getTime();
		var dateB = b.deadline.getTime();
		return dateA > dateB ? 1 : -1;  
	};

	checkCoincidence(notes:Note[],name:string, i:number):boolean
	{
		if (typeof notes[i] !== 'undefined') {
			return notes[i].name===name || this.checkCoincidence(notes,name,i+1);
		}
		return false;
	}
	updateBinacle(){

	}


	async toDosUpdate11(notes:Note[]) {
		let toDos = (await this.app.vault.adapter.read("ToDo's.md")).split('\n')
		toDos.forEach((line:string, index)=>{toDos[index] = line+'\n'})
		let newToDos = toDos[0]+toDos[1]+toDos[2];
		let auxNotes:string[] = [];
		let compTask = '';
		let cont = 0;
		let cont2 = 0;
		let now = new Date(Date().replace('GMT+0000','GMT-0600'))
		notes = notes.filter((task:Note)=>{
			let name = task.name;
			if (task.delete) {
				compTask+=now.getFullYear()+'-'+(now.getMonth()+1)+'-'+now.getDate()+'|[[12'+name+']]|'+task.status+'\n'
			}
			auxNotes.push(name);
			return !task.delete;
		});
		let bandIns = false;
		for (let i = 3; true; i++) {
			if (toDos[i].substring(0,1) === '#') {   //  entra a Completadas
				notes.map((nte:Note)=>{
					newToDos+='[[01'+nte.name+']]|'+nte.objective[0]+'|'+nte.status+'|'+nte.deadline.getFullYear()+'-'+(nte.deadline.getMonth()+1)+'-'+nte.deadline.getDate()+'|'+'\n';
				});
				newToDos += toDos[i]+toDos[i+1]+toDos[i+2]+compTask;
				i += 3;
				toDos.slice(i).map((line)=>{
					if(line.length>4)
						newToDos+=line;
				});
				newToDos.substring(0,toDos.length-3)
				break;
			}
			cont = 0;
			cont2 = 0;
			let line = toDos[i].split('|');
			let name = line[0].substring(4,line[0].length-2);
			bandIns = false;
			while((cont<auxNotes.length || cont2<notes.length)&&toDos[i].substring(0,1) !== '#'){
				if (auxNotes.length>cont && auxNotes[cont]===name) {
					auxNotes.splice(cont,1);
					bandIns = true;
					break
				}
				else if(notes.length>cont2 && notes[cont2].deadline.getTime() < (new Date(line[3])).getTime()){
					newToDos += '[[01'+notes[cont2].name+']]|'+notes[cont2].objective[0]+'|'+notes[cont2].status+'|'+notes[cont2].deadline.getFullYear()+'-'+(notes[cont2].deadline.getMonth()+1)+'-'+notes[cont2].deadline.getDate()+'|'+'\n';
					notes.splice(cont2,1);
					bandIns = true;
					i--;
					break;
				}
				cont++;
				cont2++;
			}
			if(!bandIns){
				newToDos += toDos[i];
			}
		}// hacer test de todo
		return newToDos;
	}
	async toDosUpdate00_10(notes:Note[]) {
		let toDos = (await this.app.vault.adapter.read("ToDo's.md")).split('\n')
		toDos.forEach((line:string, index)=>{toDos[index] = line+'\n'})
		let newToDos = toDos[0]+toDos[1]+toDos[2];
		let auxNotes:Note[] = [];
		let cont = 0;
		for (let i = 3; i < toDos.length; i++) {
			if (toDos[i].substring(0,1) === '#') {   //  entra a Completadas
				notes.map((nte:Note)=>{
					newToDos+='[[01'+nte.name+']]|'+nte.objective[0]+'|'+nte.status+'|'+nte.deadline.getFullYear()+'-'+(nte.deadline.getMonth()+1)+'-'+nte.deadline.getDate()+'|'+'\n';
					if (nte.delete) {
						auxNotes.push(nte);		//#aqui	
					}
				});
				newToDos = newToDos + toDos[i]+toDos[i+1]+toDos[i+2]
				i += 3;
				toDos = toDos.slice(i).filter((line:string)=>{
					let spl = line.split('|');
					if(spl.length==1)return false;
					return !this.checkCoincidence(auxNotes,spl[1].substring(4,spl[1].length-2),0);
				});
				toDos.map((line)=>{
					newToDos+=line});
				newToDos.substring(0,-2);
				break;
				
			}
			cont = 0;
			let line = toDos[i].split('|');
			while(cont<notes.length){ //  agrega las notas con prioridad de tiempo
				if (notes[cont].deadline.getTime() < (new Date(line[3])).getTime()) {
					newToDos += '[[01'+notes[cont].name+']]|'+notes[cont].objective[0]+'|'+notes[cont].status+'|'+notes[cont].deadline.getFullYear()+'-'+(notes[cont].deadline.getMonth()+1)+'-'+notes[cont].deadline.getDate()+'|'+'\n';
					if (notes[cont].delete) {
						auxNotes.push(notes.splice(cont,1)[0]);
					}
					else	notes.splice(cont,1);
					cont--;
					if (notes.length==0) {
						while(toDos[i].substring(0,1) !== '#'){
							newToDos += toDos[i]
							i++;
						}
						i--;
						break;
					}
				}
				else {
					newToDos += toDos[i];
					break;
				}
				cont++;
			}
			
			
		}// hacer test de todo
		// console.log(newToDos);
		return newToDos
	}

	
	handleScan(){
		this.app.vault.adapter.list("ToDo's").then(async(reader:ListedFiles)=>{
			let listToDos:Note[] = [];
			let listToUpdate:Note[] = [];
			let newTaskFileName:string[] = [];
			let compTask:string[] = [];
			reader.files.forEach((path:string) => {
				let fileName = path.split('/')[1];
				// Busca la tarea nueva sin insertar para insertar en todo's
				if(fileName.substring(0,2) === '00'){
					listToDos.push({name:fileName.substring(2,fileName.length-3),status:"",deadline:new Date,objective:[""],delete:false});
					newTaskFileName.push(path);
				}
				// busca los archivos que tengan la tarea completada con objetivo nuevo para insertar en todo's
				else if(fileName.substring(0,2) === '10'){
					listToDos.push({name:fileName.substring(2,fileName.length-3),status:"",deadline:new Date,objective:[""],delete:true});
					newTaskFileName.push(path);
				}
				// Busca notas con cambios para actualizar avance(listo)
				else if(fileName.substring(0,2) === '11'){
					listToUpdate.push({name:fileName.substring(2,fileName.length-3),status:"",deadline:new Date,objective:[""],delete:false,delBand:0});
				}
			});
			// extrae la info de las notas para actualizar toDos
			if (newTaskFileName.length!=0) {
				for (let i = 0; i < listToDos.length; i++) {
					let reader = await this.app.vault.adapter.read(newTaskFileName[i]);
					this.getNewTask(reader, listToDos[i]);
				}
				listToDos.sort(this.sortFunction);
				newTaskFileName.forEach(file => {
					this.app.vault.adapter.rename(file, file.replace(/\/\d0/,'/01'));
				});
				let doc = await this.toDosUpdate00_10(listToDos);
				this.app.vault.adapter.write("ToDo's.md", doc);
			}
			if (listToUpdate.length != 0) {
				for (let i = 0; i < listToUpdate.length; i++) {
					let reader = await this.app.vault.adapter.read("ToDo's/11"+listToUpdate[i].name+'.md');
					this.getNewTask(reader, listToUpdate[i]);
					let [newNote,aux] = this.createNewTaskNote(listToUpdate[i],reader);
					compTask = compTask.concat(aux);
					if (listToUpdate[i].delete) {
						await this.app.vault.adapter.write("ToDo's/11"+listToUpdate[i].name+'.md', newNote);
						await this.app.vault.adapter.rename("ToDo's/11"+listToUpdate[i].name+'.md', "ToDo's/12"+listToUpdate[i].name+'.md');
					}
					else{
						await this.app.vault.adapter.write("ToDo's/11"+listToUpdate[i].name+'.md', newNote);
						await this.app.vault.adapter.rename("ToDo's/11"+listToUpdate[i].name+'.md', "ToDo's/01"+listToUpdate[i].name+'.md');
					}
				}
				let auxCompTask = compTask.join('\n');
				if(auxCompTask.length>0){
					let now = new Date(Date().replace('GMT+0000','GMT-0600'))
					let name = now.getFullYear()+'-'+((now.getMonth()+1)<10?'0'+(now.getMonth()+1):(now.getMonth()+1))+'-'+(now.getDate()<10?'0'+now.getDate():now.getDate());
					let daily = (await this.app.vault.adapter.read("01 Journal/01 Daily/"+name+'.md'))
					.split('\n').filter((line:string)=>{
						return line.length>0
					});
					let i = daily.length-1;
					while(i>0){
						if(daily[i].substring(0,1)==='#'){
							daily.splice(i+3,0,auxCompTask);
							break;
						}
						i--;
					}
					await this.app.vault.adapter.write("01 Journal/01 Daily/"+name+'.md', daily.join('\n'));
				}
				listToUpdate.sort(this.sortFunction)

				let doc = await this.toDosUpdate11(listToUpdate);
				this.app.vault.adapter.write("ToDo's.md",doc);
			}
			
		})
	}

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			this.handleScan();
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: toDosPlugin;

	constructor(app: App, plugin: toDosPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
