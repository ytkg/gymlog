require "fileutils"

task :to_json do
  input_path = "/Users/ytkg/Documents/obsidian/ジム記録/logs.md"
  output_path = File.expand_path("src/logs.json", __dir__)

  FileUtils.mkdir_p(File.dirname(output_path))
  ruby "./scripts/convert_logs_to_json.rb", "-i", input_path, "-o", output_path
end
