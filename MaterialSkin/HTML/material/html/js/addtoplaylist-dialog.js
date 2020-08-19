/**
 * LMS-Material
 *
 * Copyright (c) 2018-2020 Craig Drummond <craig.p.drummond@gmail.com>
 * MIT license.
 */
'use strict';

Vue.component('lms-addtoplaylist-dialog', {
    template: `
<v-dialog v-model="show" v-if="show" persistent width="600">
 <v-card>
  <v-card-title>{{i18n('Add to playlist')}}</v-card-title>
  <v-form>
   <v-list two-line>
    <v-list-tile>
     <v-list-tile-content>
      <v-combobox v-model="name" :items="existing" :label="i18n('Name')" class="lms-search" ref="entry" id="addtoplaylist-name"></v-combobox>
     </v-list-tile-content>
    </v-list-tile>
   </v-list>
  </v-form>
  <v-card-actions>
   <v-spacer></v-spacer>
   <v-btn flat @click.native="cancel()">{{i18n('Cancel')}}</v-btn>
   <v-btn flat @click.native="save()">{{nameExists ? i18n('Add') : i18n('Create')}}</v-btn>
  </v-card-actions>
 </v-card>
</v-dialog>
`,
    props: [],
    data() {
        return {
            show: false,
            name: "",
            nameExists: false,
            errorMessages: undefined,
            existing: []
        }
    },
    mounted() {
        this.existingSet = new Set();
        bus.$on('addtoplaylist.open', function(items) {
            this.show = true;
            this.items = items;
            this.errorMessages = undefined;
            focusEntry(this);
            lmsCommand("", ["playlists", 0, 10000]).then(({data})=>{
                if (data && data.result && data.result.playlists_loop) {
                    var loop = data.result.playlists_loop;
                    this.existing = [];
                    this.existingSet = new Set();
                    for (var i=0, len=loop.length; i<len; ++i) {
                        this.existing.push(loop[i].playlist);
                        this.existingSet.add(loop[i].playlist);
                    }
                    this.existing.sort();
                }
            });
        }.bind(this));
        bus.$on('noPlayers', function() {
            this.show=false;
        }.bind(this));
        bus.$on('esc', function() {
            if (this.$store.state.activeDialog == 'addtoplaylist') {
                this.show=false;
            }
        }.bind(this));
    },
    methods: {
        cancel() {
            this.show=false;
        },
        save() {
            // For some reason 'this.name' is not updated if th ecombo has focus when the
            // button is pressed. Work-around this by getting the element's value...
            var elem = document.getElementById('addtoplaylist-name');
            var name = elem && elem.value ? elem.value.trim() : "";
            if (name.length<1) {
                return;
            }
            this.show=false;

            var urls=[];
            for (var i=0, len=this.items.length; i<len; ++i) {
                if (this.items[i].url) {
                    urls.push(this.items[i].url);
                }
            }

            if (urls.length>0) {
                lmsCommand("", ["playlists", "new", "name:"+name]).then(({data})=>{
                    var playlistId = undefined;
                    if (data && data.result) {
                        if (data.result.overwritten_playlist_id) {
                            playlistId = data.result.overwritten_playlist_id;
                        } else if (data.result.playlist_id) {
                            playlistId = data.result.playlist_id;
                        }
                    }
                    if (playlistId!=undefined) {
                        this.savePlaylist(name, playlistId, urls);
                    } else {
                        bus.$emit('showError', err, i18n("Failed to add to playlist!"));
                    }
                }).catch(err => {
                    bus.$emit('showError', err, i18n("Failed to add to playlist!"));
                    logError(err);
                });
            } else {
                bus.$emit('showError', err, i18n("Failed to add to playlist!"));
            }
        },
        savePlaylist(name, id, urls) {
            var url = urls.shift();
            lmsCommand("", ["playlists", "edit", "playlist_id:"+id, "cmd:add", "url:"+url]).then(({data})=>{
                if (urls.length>0) {
                    this.savePlaylist(name, id, urls);
                } else {
                    bus.$emit('showMessage', i18n("Added to '%1'", name));
                }
            }).catch(err => {
                bus.$emit('showError', err, i18n("Failed to add to playlist!"));
                logError(err);
            });
        },
        i18n(str) {
            if (this.show) {
                return i18n(str);
            } else {
                return str;
            }
        }
    },
    watch: {
        'show': function(val) {
            this.$store.commit('dialogOpen', {name:'addtoplaylist', shown:val});
        }
    }
})

