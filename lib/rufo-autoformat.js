'use babel';

import { CompositeDisposable } from 'atom';
var spawn = require('child_process').spawn
var exec = require('child_process').exec

export default {
  subscriptions: null,
  activate(state) {
    this.subscriptions = new CompositeDisposable()
    var _this = this
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'rufo-autoformat:format': function() { _this.format() }
    }));

    atom.workspace.observeTextEditors(function(editor) {
      editor.onDidSave(function(evt) {
        if(editor.getGrammar().name == "Ruby") {
          // Just use `rufo` to update the file in place
          console.log("rufo-autoformat on save", evt.path)
          var projectHome = atom.project.getPaths()[0]
          exec("rufo " + evt.path, {cwd: projectHome})
        }
      })
    })
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  format() {
    console.log('Formatting with rufo...')
    var projectHome = atom.project.getPaths()[0]
    exec("which rufo", {cwd: projectHome}, function(err, stdout, stderr) {
      if (err) {
        throw err
      }
      if (!stdout) {
        throw new Error("`rufo` not found; install it with `gem install rufo`")
      }
      console.log("Path to rufo: " + stdout)
      var editor = atom.workspace.getActiveTextEditor()
      var text = editor.getBuffer().getText();
      // Start up rufo and feed it the current contents of the file
      var child = spawn('rufo', {cwd: projectHome})
      child.stdin.write(text);
      child.stdin.end();
      // Gather the formatted code here:
      var data = '';
      child.stdout.on('data', function(chunk) {
        data += chunk;
      });
      // When rufo is done, replace the text in the editor
      child.stdout.on('end', function() {
        var text = data.toString()
        if (text !== "") {
          editor.setText(text);
        }
      });
      // Also gather any error output
      var errText = ""
      child.stderr.on('data', function(data){
        errText += data.toString()
      })
      child.stderr.on("end", function() {
        if (errText) {
          throw new Error("Failed to run `rufo`:\n\n" + errText)
        }
      })
    })
  }
}
