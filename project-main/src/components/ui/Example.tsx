import { useState } from 'react';
import { Button, Input, Modal, Card, Badge } from './index';
import { Mail, Lock } from 'lucide-react';

const UIComponentsExample = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        UI Component Library Examples
      </h1>

      <Card
        header={<h2 className="text-xl font-semibold">Buttons</h2>}
        shadow="lg"
      >
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="danger">Danger Button</Button>
            <Button variant="ghost">Ghost Button</Button>
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>

          <div className="flex gap-3">
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>

          <Button fullWidth>Full Width Button</Button>
        </div>
      </Card>

      <Card
        header={<h2 className="text-xl font-semibold">Inputs</h2>}
        shadow="lg"
      >
        <div className="space-y-4 max-w-md">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            leftIcon={<Mail className="h-5 w-5" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter password"
            leftIcon={<Lock className="h-5 w-5" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Input
            label="With Error"
            type="text"
            error="This field is required"
            placeholder="Enter value"
          />

          <Input
            label="Success State"
            type="text"
            success
            value="Valid input"
            helperText="Looks good!"
          />
        </div>
      </Card>

      <Card
        header={<h2 className="text-xl font-semibold">Badges</h2>}
        shadow="lg"
      >
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Badge color="green">Success</Badge>
            <Badge color="yellow">Warning</Badge>
            <Badge color="red">Error</Badge>
            <Badge color="blue">Info</Badge>
            <Badge color="gray">Default</Badge>
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            <Badge size="sm">Small</Badge>
            <Badge size="md">Medium</Badge>
            <Badge size="lg">Large</Badge>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Badge color="green" dot>
              Active
            </Badge>
            <Badge color="red" dot>
              Offline
            </Badge>
            <Badge color="yellow" dot>
              Pending
            </Badge>
          </div>
        </div>
      </Card>

      <Card
        header={<h2 className="text-xl font-semibold">Cards</h2>}
        shadow="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card shadow="sm" hoverable>
            <h3 className="font-semibold mb-2">Hoverable Card</h3>
            <p className="text-gray-600 text-sm">
              Hover over me to see the effect
            </p>
          </Card>

          <Card
            shadow="md"
            border="medium"
            header={<span className="font-medium">With Header</span>}
          >
            <p className="text-gray-600 text-sm">Card with header section</p>
          </Card>

          <Card
            shadow="lg"
            footer={
              <Button size="sm" fullWidth>
                Action
              </Button>
            }
          >
            <h3 className="font-semibold mb-2">With Footer</h3>
            <p className="text-gray-600 text-sm">Card with footer section</p>
          </Card>
        </div>
      </Card>

      <Card
        header={<h2 className="text-xl font-semibold">Modal</h2>}
        shadow="lg"
      >
        <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Example Modal"
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>Confirm</Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              This is an example modal with a title, body content, and footer
              actions.
            </p>
            <Input
              label="Name"
              placeholder="Enter your name"
              helperText="This field is optional"
            />
          </div>
        </Modal>
      </Card>
    </div>
  );
};

export default UIComponentsExample;
