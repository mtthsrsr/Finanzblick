import { contextBridge, ipcRenderer } from 'electron'
import type { API } from '../shared/model'
const api:API={financeRead:()=>ipcRenderer.invoke('finance:read'),financeSave:value=>ipcRenderer.invoke('finance:save',value),fullBackup:()=>ipcRenderer.invoke('finance:backup'),fullRestore:()=>ipcRenderer.invoke('finance:restore'),refreshAll:onlyUpgrade=>ipcRenderer.invoke('funds:refreshAll',onlyUpgrade),importHoldings:()=>ipcRenderer.invoke('funds:importHoldings'),lookup:isin=>ipcRenderer.invoke('funds:lookup',isin),read:()=>ipcRenderer.invoke('funds:read'),save:state=>ipcRenderer.invoke('funds:save',state),exportData:()=>ipcRenderer.invoke('funds:export'),importData:()=>ipcRenderer.invoke('funds:import')}
contextBridge.exposeInMainWorld('fonds',api)
