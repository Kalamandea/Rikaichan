/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

let state = false;

function rikaiToggle(){
	state = !state;
	let btn = document.getElementById('toggle');
	if (state){
		btn.innerText = 'Off';
		btn.setAttribute('class', 'btn btn btn-danger');
		browser.extension.getBackgroundPage().rikaichanWebEx.processMessage();
	}else{
		btn.innerText = 'On';
		btn.setAttribute('class', 'btn btn btn-success');
		browser.extension.getBackgroundPage().rikaichanWebEx.processMessage();
	}
	
}

function openOptions(){
	browser.runtime.openOptionsPage();
}

document.getElementById('toggle').onclick = rikaiToggle;
document.getElementById('open-options').onclick = openOptions;