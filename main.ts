import { read } from 'fs';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ListedFiles } from 'obsidian';
import { arrayBuffer } from 'stream/consumers';

// Remember to rename these classes and interfaces!

interface ToDosSettings {
	mySetting: string;
}

interface Note {
	name:string;
	deadline:Date;
	status:string;
	objective:string[],
	insert:boolean
}
const DEFAULT_SETTINGS: ToDosSettings = {
	mySetting: 'default'
}

export default class toDosPlugin extends Plugin {
	settings: ToDosSettings;
	getNewTask(reader:any, note:Note, edit?:any){
		let auxTask:string[] = []
		reader = reader.split('\n');
		note.deadline = new Date(reader[0].split('-'))
		let i = 2;
		for (; i < reader.length; i++) {
			if(reader[i].substring(0,1)!=='#') {
				auxTask.push(reader[i])
			}
			else break;
		}
		i++;
		note.objective = auxTask;
		note.status = reader[i];
		return
	}
	sortFunction(a:Note,b:Note){
		var dateA = a.deadline.getTime();
		var dateB = b.deadline.getTime();
		return dateA > dateB ? 1 : -1;  
	};
	checkCoincidence(notes:Note[],name:string, i:number):boolean
	{
		if (notes[i]!==undefined) {
			console.log(notes[i].name,name,1);
			return notes[i].name===name || this.checkCoincidence(notes,name,i+1);
		}
		return false; // acomodoar returns recursivos para filtrar las que se eliminan
	}
	async toDosUpdate(notes:Note[]) {
		let toDos = (await this.app.vault.adapter.read("ToDo's.md")).split('\n');
		toDos.forEach((line:string, index)=>{toDos[index] = line+'\n'})
		let newToDos = toDos[0]+toDos[1]+toDos[2];
		let auxNotes:Note[] = [];
		let cont = 0;
		let endBand = false;
		for (let i = 3; i < toDos.length; i++) {   //  esta entrando aqui sin insertar las notas si son las ultimas tareas
			//ademas está tomando -1 dia en las fechas en toDos no se porque
			if (toDos[i].substring(0,1) === '#') {   //  entra a Completadas
				endBand = true;
				notes.map((nte:Note)=>{newToDos+=nte.name.substring(0,nte.name.length-3)+'|'+nte.objective[0]+'|'+nte.deadline.getFullYear()+'-'+(nte.deadline.getMonth()+1)+'-'+nte.deadline.getDate()+'|'+'|'+'\n';});
				newToDos = newToDos + toDos[i]+toDos[i+1]+toDos[i+2]
				i += 2;

				////////////////           segun yo esto elimina las notas recuperadas/ comprobar eliminar completadas, 
				toDos = toDos.slice(i).filter((line:string)=>{
					let spl = line[i].split('|');
					return !this.checkCoincidence(auxNotes,spl[1],0)
				})
				toDos.slice(1).map((line)=>{newToDos+=line});
				newToDos.substring(0,toDos.length-3)
				break;
				
			}
			cont = 0;
			let line = toDos[i].split('|');
			while(cont<notes.length){ //  agrega las notas con prioridad de tiempo
				if (notes[cont].deadline.getTime() < (new Date(line[2])).getTime()) {
					newToDos += notes[cont].name.substring(0,notes[cont].name.length-3)+'|'+notes[cont].objective[0]+'|'+notes[cont].deadline.getFullYear()+'-'+(notes[cont].deadline.getMonth()+1)+'-'+notes[cont].deadline.getDate()+'|'+'|'+'\n';
					if (notes[cont].name.substring(0,2) === '10') {
						auxNotes.concat(notes.splice(cont,1));					
					}
					notes.splice(cont,1);
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
		
		console.log(newToDos);
	}
	// while(cont<notes.length){
	// 	let line = toDos[i].split('|');
	// 	if (line[0].substring(3, auxNote.name.length-1) === auxNote.name.substring(2)) {  //  que sea 
	// 		newToDos = newToDos+line[0]+'|'+auxNote.deadline.getDate()+'|\n';
	// 		break;
	// 	}
	// 	else if (auxNote.deadline.getTime() < (new Date(line[2])).getTime()) {
	// 		break;
	// 	}
	// 	else newToDos += toDos[i];
	// }

	handleScan(){
		this.app.vault.adapter.list("ToDo's").then(async(reader:ListedFiles)=>{
			let listToDos:Note[] = [];
			let listToUpdate:Note[] = [];
			reader.files.forEach((fileName:string) => {
				fileName = fileName.split('/')[1];
				// Busca la tarea nueva sin insertar para insertar en todo's
				if(fileName.substring(0,2) === '00'){
					listToDos.push({name:fileName,status:"",deadline:new Date,objective:[""],insert:true});
				}
				// busca los archivos que tengan la tarea completada con objetivo nuevo para insertar en todo's
				else if(fileName.substring(0,2) === '10'){
					listToDos.push({name:fileName,status:"",deadline:new Date,objective:[""],insert:true});
				}
				// Busca notas con cambios para actualizar avance(listo)
				else if(fileName.substring(0,2) === '01'){    //////////////           pendiente
					listToUpdate.push({name:fileName,status:"",deadline:new Date,objective:[""],insert:true});
				}
			});
			// extrae la info de las notas para actualizar toDos
			if (listToDos.length!=0) {
				for (let i = 0; i < listToDos.length; i++) {
					let reader = await this.app.vault.adapter.read("ToDo's/"+listToDos[i].name);
					this.getNewTask(reader, listToDos[i]);
				}
				listToDos.sort(this.sortFunction);
				this.toDosUpdate(listToDos);

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

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

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
