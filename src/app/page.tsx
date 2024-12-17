import Chat from '../components/Chat'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <main className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Eliza Chatbot</h1>
        <Chat />
      </main>
    </div>
  )
}
